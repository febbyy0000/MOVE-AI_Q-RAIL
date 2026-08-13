"""
Q-RAIL — 해외 구간(TCR/CRIMT) 운임 계산 서비스

계산 흐름:
  1) overseas_rate_anchors 테이블에서 목적지별 최신 활성 앵커 단가 조회
  2) 앵커 × 변동폭 × 환율밴드 → 운임 범위(min/max) 산출
  3) 계산 이력을 overseas_calc_log 테이블에 적재
  4) Gemini로 품목 HS Code 분류 (운임 계산과 별개)

DB 앵커가 없으면 코드 상수(_FALLBACK_ANCHORS)로 폴백한다.
현재 지원 규격: 40ft 컨테이너 전용.
"""

import json
import logging
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SectionCategory
from app.models.overseas_rate_anchor import OverseasRateAnchor
from app.models.overseas_calc_log import OverseasCalcLog

logger = logging.getLogger(__name__)

# ── 폴백 상수 (DB 앵커 없을 때만 사용) ───────────────────────────────────────
# 출처: CRIMT 인보이스 XS26061809165738556 (2026-06-18)
_FALLBACK_ANCHORS: dict[str, dict] = {
    "horgos":   {"anchor_usd": Decimal("2411.00"), "volatility": Decimal("0.0300"), "confirmed": True},
    "almaty":   {"anchor_usd": Decimal("2943.00"), "volatility": Decimal("0.0250"), "confirmed": False},
    "tashkent": {"anchor_usd": Decimal("5123.00"), "volatility": Decimal("0.0150"), "confirmed": True},
}

_FX_BAND = Decimal("0.0150")  # 환율 밴드 ±1.5%

SUPPORTED_DESTINATIONS = set(_FALLBACK_ANCHORS.keys())

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
    analysis:         OverseasAnalysis
    items:            list[OverseasItem]
    sample_n:         int
    error_rate:       Decimal
    usd_base:         Decimal
    usd_min:          Decimal
    usd_max:          Decimal
    krw_min:          Decimal
    krw_max:          Decimal
    calc_steps:       list[str] = field(default_factory=list)
    anchor_confirmed: bool = False
    # 계산에 사용된 앵커 정보 (quote 저장 후 calc_log 적재용)
    _anchor_id:       int | None = field(default=None, repr=False)
    _anchor_usd:      Decimal = field(default=Decimal("0"), repr=False)
    _volatility:      Decimal = field(default=Decimal("0"), repr=False)
    _quantity:        int = field(default=0, repr=False)
    _exchange_rate:   Decimal = field(default=Decimal("0"), repr=False)


async def _fetch_anchor(db: AsyncSession, destination: str) -> tuple[OverseasRateAnchor | None, dict]:
    """
    overseas_rate_anchors에서 목적지별 최신 활성 앵커를 조회한다.
    없으면 폴백 상수를 반환한다.
    """
    try:
        result = await db.execute(
            select(OverseasRateAnchor)
            .where(
                OverseasRateAnchor.destination == destination,
                OverseasRateAnchor.is_active == True,  # noqa: E712
            )
            .order_by(OverseasRateAnchor.created_at.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        if row:
            logger.info(
                "[overseas_calc] DB 앵커 조회 성공 | destination=%s anchor_id=%d "
                "anchor_usd=%.2f volatility=%.4f confirmed=%s invoice_no=%s",
                destination, row.id, float(row.anchor_usd),
                float(row.volatility), row.confirmed, row.invoice_no,
            )
            return row, {
                "anchor_usd": row.anchor_usd,
                "volatility": row.volatility,
                "confirmed":  row.confirmed,
            }
    except Exception as exc:
        logger.warning("[overseas_calc] DB 앵커 조회 실패, 폴백 사용 | error=%s", exc)

    fallback = _FALLBACK_ANCHORS[destination]
    logger.warning(
        "[overseas_calc] 폴백 앵커 사용 | destination=%s anchor_usd=%.2f",
        destination, float(fallback["anchor_usd"]),
    )
    return None, fallback


async def _call_llm_analysis(item_name: str) -> OverseasAnalysis:
    """Gemini로 품목 HS Code 분류 및 위험물 여부 판정."""
    from app.core.config import settings
    api_key = getattr(settings, "GEMINI_API_KEY", "")

    logger.info("[overseas_calc] Gemini 품목 분석 요청 | item_name=%s", item_name)

    if not api_key:
        logger.warning("[overseas_calc] GEMINI_API_KEY 미설정 — 품목 분석 건너뜀")
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
        result = OverseasAnalysis(
            hs_code=str(data.get("hs_code", "0000.00")),
            item_category=str(data.get("item_category", item_name)),
            is_hazardous=bool(data.get("is_hazardous", False)),
            gemini_used=True,
        )
        logger.info(
            "[overseas_calc] Gemini 품목 분석 완료 | hs_code=%s category=%s hazardous=%s",
            result.hs_code, result.item_category, result.is_hazardous,
        )
        return result
    except Exception as exc:
        logger.warning("[overseas_calc] Gemini 품목 분석 실패 (%s) — 폴백 적용", exc)
        return OverseasAnalysis(hs_code="0000.00", item_category=item_name, is_hazardous=False)


def _calc_range(
    anchor_usd: Decimal,
    volatility: Decimal,
    qty: int,
    exchange_rate: Decimal,
) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal, list[str]]:
    """
    앵커 단가 × 변동폭 × 환율밴드 → (usd_base, usd_min, usd_max, krw_min, krw_max, steps)
    """
    usd_base = (anchor_usd * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    usd_min  = (anchor_usd * (1 - volatility) * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    usd_max  = (anchor_usd * (1 + volatility) * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    r_lo = (exchange_rate * (1 - _FX_BAND)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    r_hi = (exchange_rate * (1 + _FX_BAND)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    krw_min = (usd_min * r_lo).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    krw_max = (usd_max * r_hi).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    steps = [
        f"앵커 단가        {float(anchor_usd):,.2f} USD/40ft  (CRIMT 인보이스 실청구)",
        f"규격             40ft 기준 (규격계수 1.0)",
        f"운임 변동폭      ±{float(volatility)*100:.1f}%  (KORAIL 시범운행 관측)",
        f"= USD 범위       {float(usd_min):,.2f} ~ {float(usd_max):,.2f} USD",
        f"기준 환율        {float(exchange_rate):,.2f} 원/USD",
        f"환율 밴드        ±{float(_FX_BAND)*100:.1f}%  →  {float(r_lo):,.2f} ~ {float(r_hi):,.2f} 원/USD",
        f"수량             × {qty}개",
        f"= 원화 범위      {int(krw_min):,} ~ {int(krw_max):,} 원",
    ]
    return usd_base, usd_min, usd_max, krw_min, krw_max, steps


async def predict_overseas_quote(
    db:            AsyncSession,
    containers:    list[tuple[str, int]],
    item_name:     str,
    destination:   str,
    exchange_rate: Decimal,
    quote_id:      str | None = None,
) -> OverseasResult:
    """
    해외 구간(TCR/CRIMT) 운임 계산.

    - 40ft 컨테이너만 지원. 다른 규격 포함 시 ValueError.
    - DB 앵커 조회 → 없으면 코드 상수 폴백.
    - 계산 이력을 overseas_calc_log에 기록.
    - Gemini로 품목 HS Code 분류.
    """
    logger.info(
        "[overseas_calc] 해외 운임 계산 시작 | destination=%s containers=%s "
        "item_name=%s exchange_rate=%.2f quote_id=%s",
        destination, containers, item_name, float(exchange_rate), quote_id,
    )

    if destination not in SUPPORTED_DESTINATIONS:
        raise ValueError(
            f"지원하지 않는 목적지: {destination}. 지원: {sorted(SUPPORTED_DESTINATIONS)}"
        )

    for ct, qty in containers:
        ct_lower = ct.lower()
        if "20" in ct_lower or "45" in ct_lower:
            raise ValueError(f"현재 40ft 컨테이너만 지원합니다. 요청 규격: {ct}")

    total_qty = sum(qty for _, qty in containers)

    # 1. DB에서 앵커 조회 (없으면 폴백)
    anchor_row, anchor_data = await _fetch_anchor(db, destination)

    anchor_usd = anchor_data["anchor_usd"]
    volatility  = anchor_data["volatility"]
    confirmed   = anchor_data["confirmed"]

    # 2. 운임 범위 계산
    usd_base, usd_min, usd_max, krw_min, krw_max, steps = _calc_range(
        anchor_usd=anchor_usd,
        volatility=volatility,
        qty=total_qty,
        exchange_rate=exchange_rate,
    )

    logger.info(
        "[overseas_calc] 계산 완료 | destination=%s qty=%d "
        "usd_base=%.2f usd_min=%.2f usd_max=%.2f krw_min=%d krw_max=%d",
        destination, total_qty,
        float(usd_base), float(usd_min), float(usd_max),
        int(krw_min), int(krw_max),
    )

    # 3. Gemini 품목 분류 (calc_log는 quote 저장 후 호출자가 직접 적재)
    analysis = await _call_llm_analysis(item_name)

    dest_kr = _DEST_KR.get(destination, destination)
    items = [
        OverseasItem(
            item_name=f"대륙철도 운임 (연운항 → {dest_kr})",
            basis=(
                f"CRIMT 실청구 {float(anchor_usd):,.2f} USD/40ft"
                f" × {total_qty}개 · 변동 ±{float(volatility)*100:.1f}%"
                f" · 환율밴드 ±{float(_FX_BAND)*100:.1f}%"
            ),
            note="확정" if confirmed else "잠정",
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
        error_rate=volatility,
        usd_base=usd_base,
        usd_min=usd_min,
        usd_max=usd_max,
        krw_min=krw_min,
        krw_max=krw_max,
        calc_steps=steps,
        anchor_confirmed=confirmed,
        _anchor_id=anchor_row.id if anchor_row else None,
        _anchor_usd=anchor_usd,
        _volatility=volatility,
        _quantity=total_qty,
        _exchange_rate=exchange_rate,
    )


async def save_calc_log(db: AsyncSession, quote_id: str, destination: str, overseas: OverseasResult) -> None:
    """quote 저장 후 호출. overseas_calc_log에 계산 이력을 적재한다."""
    try:
        log = OverseasCalcLog(
            quote_id=quote_id,
            anchor_id=overseas._anchor_id,
            destination=destination,
            anchor_usd=overseas._anchor_usd,
            volatility=overseas._volatility,
            anchor_confirmed=overseas.anchor_confirmed,
            quantity=overseas._quantity,
            exchange_rate=overseas._exchange_rate,
            fx_band=_FX_BAND,
            usd_base=overseas.usd_base,
            usd_min=overseas.usd_min,
            usd_max=overseas.usd_max,
            krw_min=overseas.krw_min,
            krw_max=overseas.krw_max,
            calc_steps=overseas.calc_steps,
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)
        logger.info(
            "[overseas_calc] 계산 이력 적재 완료 | calc_log_id=%d quote_id=%s anchor_id=%s",
            log.id, quote_id, overseas._anchor_id,
        )
    except Exception as exc:
        logger.error("[overseas_calc] 계산 이력 적재 실패 | quote_id=%s error=%s", quote_id, exc)
        raise
