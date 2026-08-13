"""
해외 운임 앵커 단가 적재 서비스

인보이스 파싱 결과(llm_invoice_parser)를 overseas_rate_anchors 테이블에 기록한다.
이후 overseas_calc.py가 이 테이블을 읽어 운임을 계산한다.

목적지 결정 방식
  1) dest_map이 있으면 {"2411": "horgos", ...} 형식으로 단가→목적지를 수동 지정 (confirmed=True)
  2) 없으면 현재 DB 앵커 → 없으면 KORAIL 견적서 기준가와 ±10% 이내 자동 매칭 (confirmed=False)

주의: CRIMT 인보이스의 To 칸은 빈칸으로 오므로 목적지 자동 매칭은 추정이다.
"""

import json
import logging
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.overseas_rate_anchor import OverseasRateAnchor

logger = logging.getLogger(__name__)

# KORAIL 견적서 확인 기준가 (목적지 자동 매칭용 참조값, 40ft)
_QUOTE_REF: dict[str, float] = {
    "horgos":   2400.0,
    "almaty":   3100.0,
    "tashkent": 5100.0,
}

# 목적지별 운임 변동폭 (KORAIL 시범운행 4회 관측 기반)
_VOLATILITY: dict[str, Decimal] = {
    "horgos":   Decimal("0.0300"),
    "almaty":   Decimal("0.0250"),
    "tashkent": Decimal("0.0150"),
}

_AUTO_MATCH_THRESHOLD = 0.10  # 기준가 대비 ±10% 이내만 자동 매칭


async def _resolve_destination(
    db: AsyncSession,
    unit_usd: float,
    dest_map: Optional[dict[str, str]],
) -> tuple[Optional[str], bool]:
    """
    단가 → (목적지, confirmed) 결정.
    dest_map 우선 → DB 현재 앵커 대조 → KORAIL 견적서 기준가 대조 순으로 시도.
    """
    key = str(int(unit_usd))
    if dest_map and key in dest_map:
        return dest_map[key], True

    # DB에 적재된 현재 앵커와 대조
    try:
        result = await db.execute(
            select(OverseasRateAnchor)
            .where(OverseasRateAnchor.is_active == True)  # noqa: E712
        )
        rows = result.scalars().all()
        if rows:
            cands = [
                (r.destination, abs(unit_usd - float(r.anchor_usd)) / float(r.anchor_usd))
                for r in rows
            ]
            best_dest, gap = min(cands, key=lambda x: x[1])
            if gap <= _AUTO_MATCH_THRESHOLD:
                return best_dest, False
    except Exception as exc:
        logger.warning("[anchor_service] DB 앵커 대조 실패 (%s) — 기준가로 폴백", exc)

    # KORAIL 견적서 기준가와 대조
    cands = [(d, abs(unit_usd - ref) / ref) for d, ref in _QUOTE_REF.items()]
    best_dest, gap = min(cands, key=lambda x: x[1])
    if gap <= _AUTO_MATCH_THRESHOLD:
        return best_dest, False

    return None, False


async def commit_invoice_to_anchors(
    db: AsyncSession,
    parsed: dict,
    dest_map: Optional[dict[str, str]] = None,
) -> dict:
    """
    인보이스 파싱 결과를 overseas_rate_anchors 테이블에 적재한다.

    Args:
        parsed:   llm_invoice_parser.parse_invoice_bytes() 반환값
        dest_map: {"2411": "horgos", "5123": "tashkent"} 형식 수동 매핑

    Returns:
        {
          "updated": [{"destination", "anchor_usd", "confirmed", "anchor_id"}],
          "skipped": [unit_usd, ...],   # 목적지 매칭 실패
          "before":  {dest: anchor_usd, ...},
          "after":   {dest: anchor_usd, ...},
        }
    """
    groups = parsed.get("groups") or {}
    lines_40ft = groups.get("40ft") or []
    invoice_no = parsed.get("invoiceNo")
    invoice_date = parsed.get("date")

    if not lines_40ft:
        return {"updated": [], "skipped": [], "before": {}, "after": {}}

    # 적재 전 현재 앵커 스냅샷
    snapshot_before = await _active_anchor_snapshot(db)

    updated = []
    skipped = []

    for line in lines_40ft:
        unit_usd: float = line["unitPriceUsd"]
        dest, confirmed = await _resolve_destination(db, unit_usd, dest_map)

        if not dest:
            logger.warning(
                "[anchor_service] 목적지 매칭 실패 — unit_usd=%.2f invoice_no=%s",
                unit_usd, invoice_no,
            )
            skipped.append(unit_usd)
            continue

        # 기존 활성 앵커 비활성화
        existing = await db.execute(
            select(OverseasRateAnchor).where(
                OverseasRateAnchor.destination == dest,
                OverseasRateAnchor.is_active == True,  # noqa: E712
            )
        )
        for row in existing.scalars():
            row.is_active = False
            logger.info(
                "[anchor_service] 기존 앵커 비활성화 | anchor_id=%d destination=%s anchor_usd=%.2f",
                row.id, dest, float(row.anchor_usd),
            )

        new_anchor = OverseasRateAnchor(
            destination=dest,
            anchor_usd=Decimal(str(unit_usd)),
            volatility=_VOLATILITY.get(dest, Decimal("0.0300")),
            confirmed=confirmed,
            invoice_no=invoice_no,
            invoice_date=invoice_date,
            raw_lines=json.dumps(line, ensure_ascii=False),
            source_note=(
                f"CRIMT 인보이스 {'단가 직접 확인' if confirmed else '소거법 추정'}"
                + (f" — {invoice_no}" if invoice_no else "")
            ),
            is_active=True,
        )
        db.add(new_anchor)
        await db.flush()  # id 채번

        logger.info(
            "[anchor_service] 앵커 적재 | anchor_id=%d destination=%s "
            "anchor_usd=%.2f confirmed=%s invoice_no=%s",
            new_anchor.id, dest, unit_usd, confirmed, invoice_no,
        )
        updated.append({
            "destination": dest,
            "anchor_usd": unit_usd,
            "confirmed": confirmed,
            "anchor_id": new_anchor.id,
        })

    await db.commit()

    snapshot_after = await _active_anchor_snapshot(db)

    return {
        "updated": updated,
        "skipped": skipped,
        "before": snapshot_before,
        "after": snapshot_after,
    }


async def _active_anchor_snapshot(db: AsyncSession) -> dict[str, float]:
    result = await db.execute(
        select(OverseasRateAnchor).where(OverseasRateAnchor.is_active == True)  # noqa: E712
    )
    return {r.destination: float(r.anchor_usd) for r in result.scalars()}
