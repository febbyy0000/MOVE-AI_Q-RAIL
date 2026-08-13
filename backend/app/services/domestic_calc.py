from dataclasses import dataclass
from decimal import Decimal

from app.core.config import settings
from app.core.rate_tables import FREIGHT_RATE_KRW_PER_KM, UNLOADING_FEE_KRW, STORAGE_FEE_10DAY_KRW


def _round100(amount: int) -> int:
    """100원 미만 반올림 (운임 공식 기준)."""
    return round(amount / 100) * 100


def _size_key(container_type: str) -> str:
    """'40ft Dry (FEU)' 같은 문자열에서 20ft/40ft/45ft 키 추출."""
    ct = container_type.lower()
    if "45" in ct:
        return "45ft"
    if "40" in ct:
        return "40ft"
    if "20" in ct:
        return "20ft"
    raise ValueError(f"지원하지 않는 컨테이너 규격: {container_type}")


@dataclass
class DomesticItem:
    item_name: str
    basis: str
    note: str
    amount: int  # KRW, VAT 미포함


def calculate_domestic(
    containers: list[tuple[str, int]],
    passes: int = 0,
) -> tuple[list[DomesticItem], Decimal, Decimal]:
    """
    국내 구간 (오봉역 → 부산항) 운임 산정.

    Args:
        containers: [(container_type, quantity), ...]  예: [("40ft Dry (FEU)", 3)]
        passes: 출입증 발급 매수 (기본 0)

    Returns:
        (line_items, pre_vat_total, total_with_vat)
        line_items 마지막 항목이 VAT 행.
    """
    distance = settings.DOMESTIC_DISTANCE_KM
    items: list[DomesticItem] = []

    size_qty: dict[str, int] = {}
    for ct, qty in containers:
        key = _size_key(ct)
        size_qty[key] = size_qty.get(key, 0) + qty

    for size, qty in size_qty.items():
        rate = FREIGHT_RATE_KRW_PER_KM[size]
        per_unit = _round100(rate * distance)
        items.append(DomesticItem(
            item_name=f"철도 운송 운임 ({size})",
            basis=f"{size} {rate:,}원/km × {distance}km × {qty}개",
            note="공시 요율",
            amount=per_unit * qty,
        ))

    for size, qty in size_qty.items():
        fee = UNLOADING_FEE_KRW[size]
        items.append(DomesticItem(
            item_name=f"하역 요금 ({size}, 일반품)",
            basis=f"{fee:,}원/개 × {qty}개",
            note="하역 요율",
            amount=fee * qty,
        ))

    for size, qty in size_qty.items():
        fee = STORAGE_FEE_10DAY_KRW[size]
        items.append(DomesticItem(
            item_name=f"기본 장치료 ({size}, 10일 이내)",
            basis=f"{fee:,}원/개 × {qty}개",
            note="정액 요금",
            amount=fee * qty,
        ))

    items.append(DomesticItem(
        item_name="정보입력료",
        basis="전산 접수 1건",
        note=f"건당 {settings.DOMESTIC_INFO_INPUT_FEE:,}원",
        amount=settings.DOMESTIC_INFO_INPUT_FEE,
    ))

    if passes > 0:
        items.append(DomesticItem(
            item_name="출입증 발급수수료",
            basis=f"{passes}장",
            note=f"장당 {settings.DOMESTIC_PASS_FEE:,}원",
            amount=settings.DOMESTIC_PASS_FEE * passes,
        ))

    pre_vat = Decimal(sum(it.amount for it in items))
    vat_amount = (pre_vat * settings.DOMESTIC_VAT_RATE).to_integral_value()
    total_with_vat = pre_vat + vat_amount

    items.append(DomesticItem(
        item_name=f"부가세 (VAT {int(settings.DOMESTIC_VAT_RATE * 100)}%)",
        basis="과세표준 합계 × 10%",
        note="",
        amount=int(vat_amount),
    ))

    return items, pre_vat, total_with_vat
