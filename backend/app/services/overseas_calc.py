"""
Q-RAIL — 해외 구간(TCR/CRIMT) 운임 계산 서비스

CRIMT(중철국제다식연운) 인보이스 XS26061809165738556 (2026-06-18) 실청구 단가 기반.
목적지별 앵커 단가 × 변동폭 × 환율 밴드로 운임 범위(min/max)를 산출한다.

현재 지원 규격: 40ft 컨테이너 전용.
현재 앵커 데이터: 코드 상수 관리 → 향후 overseas_rate_anchors DB 테이블로 이관 예정.

Gemini는 HS Code 분류 / 위험물 판정에만 사용한다.
"""

import json
import logging
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SectionCategory

logger = logging.getLogger(__name__)

# ── CRIMT 앵커 단가 원장 ───────────────────────────────────────────────────────
# 출처: CRIMT 인보이스 XS26061809165738556 (2026-06-18) 실청구 단가
# 40ft 기준 USD 단가. confirmed=False는 소거법 추정치.
_CRIMT_40FT_USD: dict[str, dict] = {
    "horgos":   {"value": 2411, "confirmed": True,  "note": "KORAIL 견적서 2,400 일치"},
    "almaty":   {"value": 2943, "confirmed": False, "note": "소거법 추정. KORAIL 견적서 3,100 대비 -5%"},
    "tashkent": {"value": 5123, "confirmed": True,  "note": "KORAIL 견적서 5,100 일치"},
}

# KORAIL 시범운행 4회 관측 기반 변동폭
_VOLATILITY: dict[str, float] = {
    "horgos":   0.030,
    "almaty":   0.025,
    "tashkent": 0.015,
}

# 환율 밴드: 견적 유효기간(7일) 내 원/달러 일간 변동 보수적 추정값
_FX_BAND = Decimal("0.015")

SUPPORTED_DESTINATIONS = set(_CRIMT_40FT_USD.keys())

_DEST_KR = {
    "horgos":   "호르고스",
    "almaty":   "알마티",
    "tashkent": "타슈켄트",
}

_LLM_SYSTEM_PROMPT = (
    "You are a Korean international freight logistics expert specializing in HS Code classification "
    "and cargo safety under IMDG/RID regulations.\n"
    "Given an item name in Korean or English, respond with ONLY a raw JSON object — "
    "no markdown fences, no explanation.\n\n"
    "Required JSON fields:\n"
    '  "hs_code"       : string  — 6-digit HS Code with dot (e.g., "8708.30")\n'
    '  "item_category" : string  — Korean description of the item category\n'
    '  "is_hazardous"  : boolean — true if dangerous goods (IMDG/RID class 1-9) '
    "or requires refrigeration (reefer cargo)"
)


@dataclass
class OverseasAnalysis:
    hs_code:       str
    item_category: str
    is_hazardous:  bool
    gemini_used:   bool = False


@dataclass
class OverseasItem:
    item_name:        str
    basis:            str
    note:             str
    section_category: SectionCategory
    currency:         str
    amount_min:       Decimal
    amount_max:       Decimal
    krw_min:          Decimal
    krw_max:          Decimal


@dataclass
class OverseasResult:
    analysis:   OverseasAnalysis
    items:      list[OverseasItem]
    sample_n:   int
    error_rate: Decimal
    usd_base:   Decimal
    usd_min:    Decimal
    usd_max:    Decimal
    krw_min:    Decimal
    krw_max:    Decimal
    # 계산 근거 단계 (calc_log 저장용)
    calc_steps: list[str] = None
    anchor_confirmed: bool = False


async def _call_llm_analysis(item_name: str) -> OverseasAnalysis:
    """Gemini로 품목 HS Code 분류 및 위험물 여부 판정."""
    from app.core.config import settings
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        return OverseasAnalysis(hs_code="0000.00", item_category=item_name, is_hazardous=False)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        resp = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"품목명: {item_name}",
            config=types.GenerateContentConfig(
                system_instruction=_LLM_SYSTEM_PROMPT,
                temperature=0.0,
                response_mime_type="application/json",
            ),
        )
        data = json.loads(resp.text or "{}")
        return OverseasAnalysis(
            hs_code=str(data.get("hs_code", "0000.00")),
            item_category=str(data.get("item_category", item_name)),
            is_hazardous=bool(data.get("is_hazardous", False)),
            gemini_used=True,
        )
    except Exception as exc:
        logger.warning("Gemini 품목 분석 실패 (%s) — 폴백 적용", exc)
        return OverseasAnalysis(hs_code="0000.00", item_category=item_name, is_hazardous=False)


def _calc_overseas(
    destination: str,
    qty: int,
    exchange_rate: Decimal,
) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal, list[str]]:
    """
    CRIMT 앵커 기반 40ft 해외 운임 범위 계산.

    Returns:
        (usd_base, usd_min, usd_max, krw_min, krw_max, steps)
    """
    anchor = _CRIMT_40FT_USD[destination]
    vol = Decimal(str(_VOLATILITY[destination]))

    usd_base = Decimal(str(anchor["value"])) * qty
    usd_min = (Decimal(str(anchor["value"])) * (1 - vol) * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    usd_max = (Decimal(str(anchor["value"])) * (1 + vol) * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    r_lo = (exchange_rate * (1 - _FX_BAND)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    r_hi = (exchange_rate * (1 + _FX_BAND)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    krw_min = (usd_min * r_lo).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    krw_max = (usd_max * r_hi).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    dest_kr = _DEST_KR.get(destination, destination)
    steps = [
        f"앵커 단가        {anchor['value']:,} USD/40ft  (CRIMT 인보이스 2026-06-18 실청구, {anchor['note']})",
        f"규격             40ft 기준 (규격계수 1.0)",
        f"운임 변동폭      ±{float(vol)*100:.1f}%  (KORAIL 시범운행 4회 관측)",
        f"= USD 범위       {float(usd_min):,.2f} ~ {float(usd_max):,.2f} USD",
        f"기준 환율        {float(exchange_rate):,.2f} 원/USD",
        f"환율 밴드        ±{float(_FX_BAND)*100:.1f}%  →  {float(r_lo):,.2f} ~ {float(r_hi):,.2f} 원/USD",
        f"수량             × {qty}개",
        f"= 원화 범위      {int(krw_min):,} ~ {int(krw_max):,} 원  (연운항 → {dest_kr})",
    ]

    return usd_base, usd_min, usd_max, krw_min, krw_max, steps


async def predict_overseas_quote(
    db:            AsyncSession,
    containers:    list[tuple[str, int]],
    item_name:     str,
    destination:   str,
    exchange_rate: Decimal,
) -> OverseasResult:
    """
    해외 구간(TCR/CRIMT) 운임 계산.

    40ft 컨테이너만 지원. 다른 규격이 포함된 경우 ValueError 발생.
    목적지: horgos / almaty / tashkent
    """
    if destination not in SUPPORTED_DESTINATIONS:
        raise ValueError(f"지원하지 않는 목적지: {destination}. 지원 목적지: {sorted(SUPPORTED_DESTINATIONS)}")

    # 40ft 전용 검증
    for ct, qty in containers:
        ct_lower = ct.lower()
        if "20" in ct_lower or "45" in ct_lower:
            raise ValueError(f"현재 40ft 컨테이너만 지원합니다. 요청된 규격: {ct}")

    total_qty = sum(qty for _, qty in containers)

    # Gemini HS Code 분류
    analysis = await _call_llm_analysis(item_name)

    # CRIMT 앵커 기반 운임 계산
    usd_base, usd_min, usd_max, krw_min, krw_max, steps = _calc_overseas(
        destination=destination,
        qty=total_qty,
        exchange_rate=exchange_rate,
    )

    anchor = _CRIMT_40FT_USD[destination]
    vol = _VOLATILITY[destination]
    dest_kr = _DEST_KR.get(destination, destination)

    items = [
        OverseasItem(
            item_name=f"대륙철도 운임 (연운항 → {dest_kr})",
            basis=(
                f"CRIMT 실청구 {anchor['value']:,} USD/40ft"
                f" × {total_qty}개 · 변동 ±{vol*100:.1f}% · 환율밴드 ±{float(_FX_BAND)*100:.1f}%"
            ),
            note="잠정" if not anchor["confirmed"] else "확정",
            section_category=SectionCategory.OVERSEAS_HORGAS,
            currency="USD",
            amount_min=usd_min,
            amount_max=usd_max,
            krw_min=krw_min,
            krw_max=krw_max,
        )
    ]

    return OverseasResult(
        analysis=analysis,
        items=items,
        sample_n=0,
        error_rate=Decimal(str(vol)),
        usd_base=usd_base,
        usd_min=usd_min,
        usd_max=usd_max,
        krw_min=krw_min,
        krw_max=krw_max,
        calc_steps=steps,
        anchor_confirmed=anchor["confirmed"],
    )
