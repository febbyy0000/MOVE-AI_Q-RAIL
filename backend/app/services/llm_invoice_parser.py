"""
인보이스 파싱 서비스 (A-02 / A-03)

CRIMT 인보이스(PDF/이미지) → 운임 데이터 + 규격계수 추출.
Gemini 2.0 Flash의 멀티모달 기능으로 문서를 읽고 구조화된 JSON을 반환한다.
파싱 후 _reconcile()로 산술 검증을 수행해 라인 합계 및 규격계수 일관성을 확인한다.
"""

import base64
import itertools
import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"}

_INVOICE_SYSTEM = """당신은 국제복합운송 인보이스 판독기입니다.
CRIMT(중철국제다식연운) 인보이스에서 운임 데이터를 추출합니다.

출력은 JSON만. 마크다운 코드펜스, 설명, 서두 금지.

스키마:
{
  "invoiceNo": string|null,
  "date": string|null,
  "containers": [{"size":"40ft"|"20ft","count":number}],
  "lines": [{"unitPriceUsd":number,"count":number}],
  "totalUsd": number|null,
  "readable": {"from":boolean,"via":boolean,"to":boolean,"containerNo":boolean}
}

규칙:
- "Freight of 51*40'8*20'" 표기는 40ft 51개 + 20ft 8개를 뜻합니다.
- "=USD 2411*36"은 단가 2411달러 × 36개입니다.
- 빈칸은 null. 절대 추측해서 채우지 마십시오.
- readable은 각 칸에 실제 값이 적혀 있으면 true, 비어 있으면 false입니다."""


def detect_media_type(raw: bytes, declared: Optional[str] = None) -> str:
    """매직 바이트로 파일 형식 판별. 클라이언트가 잘못된 타입을 보내도 여기서 바로잡는다."""
    if raw[:4] == b"%PDF":
        return "application/pdf"
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if raw[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if raw[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "image/webp"
    return declared or "application/octet-stream"


def _subsets_summing_to(counts: list[int], target: int) -> list[list[int]]:
    out = []
    for r in range(1, len(counts) + 1):
        for idx in itertools.combinations(range(len(counts)), r):
            if sum(counts[i] for i in idx) == target:
                out.append(list(idx))
    return out


def _reconcile(parsed: dict) -> dict:
    """
    LLM 출력을 산술로 검증한다.
    1) 라인 합계 = 표기 총액인가
    2) 개수 부분집합 합 = 컨테이너 대수인가 → 어느 라인이 40ft인지 산술적으로 결정
    3) 40ft/20ft 짝에서 일관된 규격계수가 나오는가
    """
    warnings: list[str] = []
    lines = parsed.get("lines") or []
    line_sum = sum(l["unitPriceUsd"] * l["count"] for l in lines)

    total = parsed.get("totalUsd")
    if total and abs(line_sum - total) > 1:
        warnings.append(f"라인 합계 {line_sum:,} ≠ 표기 총액 {total:,}")

    counts = [l["count"] for l in lines]
    groups: dict = {}
    for c in (parsed.get("containers") or []):
        subsets = _subsets_summing_to(counts, c["count"])
        if len(subsets) == 1:
            groups[c["size"]] = [lines[i] for i in subsets[0]]
        elif not subsets:
            warnings.append(f"{c['size']} {c['count']}대를 만드는 라인 조합 없음")
        else:
            warnings.append(f"{c['size']} {c['count']}대 조합이 {len(subsets)}가지 — 판정 불가")

    size_factor = None
    if "40ft" in groups and "20ft" in groups:
        ratios = []
        for s in groups["20ft"]:
            best = min(groups["40ft"], key=lambda b: abs(s["unitPriceUsd"] / b["unitPriceUsd"] - 0.717))
            ratios.append(s["unitPriceUsd"] / best["unitPriceUsd"])
        if ratios:
            size_factor = round(sum(ratios) / len(ratios), 3)
            spread = max(ratios) - min(ratios)
            if spread > 0.02:
                warnings.append(f"규격계수 편차 {spread:.3f} — 매핑 불확실")

    return {
        **parsed,
        "groups": groups,
        "sizeFactor": size_factor,
        "lineSum": line_sum,
        "warnings": warnings,
        "blankFields": [k for k, v in (parsed.get("readable") or {}).items() if not v],
    }


async def parse_invoice_bytes(data: bytes, declared_type: Optional[str] = None) -> dict:
    """
    인보이스 파일(bytes) → 파싱 결과 dict.

    Args:
        data: 파일 raw bytes
        declared_type: 클라이언트가 보낸 Content-Type (없어도 매직 바이트로 판별)

    Returns:
        invoiceNo, date, containers, lines, groups, sizeFactor, lineSum, warnings, blankFields, mediaType
    """
    mt = detect_media_type(data, declared_type)
    if mt not in SUPPORTED_TYPES:
        raise ValueError(f"지원하지 않는 파일 형식: {mt}")

    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    response = await client.aio.models.generate_content(
        model="gemini-flash-latest",
        contents=[
            types.Part.from_bytes(data=data, mime_type=mt),
            types.Part.from_text(text="이 인보이스에서 운임 데이터를 추출해 JSON으로 출력하세요."),
        ],
        config=types.GenerateContentConfig(
            system_instruction=_INVOICE_SYSTEM,
            temperature=0.0,
            response_mime_type="application/json",
        ),
    )

    try:
        parsed = json.loads(response.text or "{}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini 응답 JSON 파싱 실패: {response.text[:300]}") from e

    return _reconcile(parsed) | {"mediaType": mt}
