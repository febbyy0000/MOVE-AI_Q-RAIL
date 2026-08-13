"""
TCR 해외 구간 운임 예측 서비스 (WIP — 임시 stub)

SVR 기반 예측은 제거됨. 추후 별도 로직으로 교체 예정.
현재는 고정 임의값을 반환한다.
"""

import json
import logging
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SectionCategory

logger = logging.getLogger(__name__)

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


async def _call_llm_analysis(item_name: str) -> OverseasAnalysis:
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
        logger.warning("LLM 품목 분석 실패 (%s) — 폴백 적용", exc)
        return OverseasAnalysis(hs_code="0000.00", item_category=item_name, is_hazardous=False)


async def predict_overseas_quote(
    db:            AsyncSession,
    containers:    list[tuple[str, int]],
    item_name:     str,
    destination:   str,
    exchange_rate: Decimal,
) -> OverseasResult:
    """해외 구간 운임 예측 (WIP — 임시 고정값 반환)."""

    analysis = await _call_llm_analysis(item_name)

    # TODO: 실제 운임 산출 로직으로 교체
    usd_base = Decimal("3000.00")
    usd_min  = Decimal("2850.00")
    usd_max  = Decimal("3150.00")
    krw_min  = (usd_min * exchange_rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    krw_max  = (usd_max * exchange_rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    items = [
        OverseasItem(
            item_name="TCR 해외 운임 (임시)",
            basis="고정 임의값 — 추후 교체 예정",
            note="WIP",
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
        error_rate=Decimal("0.05"),
        usd_base=usd_base,
        usd_min=usd_min,
        usd_max=usd_max,
        krw_min=krw_min,
        krw_max=krw_max,
    )
