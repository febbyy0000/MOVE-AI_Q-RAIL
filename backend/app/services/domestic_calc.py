from dataclasses import dataclass
from decimal import Decimal

# ── 고정 요율 테이블 (향후 DB 관리자 설정으로 이관 예정) ─────────────────────

DISTANCE_KM = 450  # 오봉역 ➔ 부산항 고정 거리 (km)

# 기본 운임단가 (원/km), 일반품 기준
_FREIGHT_RATE: dict[str, int] = {
    "20ft": 516,
    "40ft": 800,
    "45ft": 946,
}

# 하역요금, 부산진역 CY, 일반품, 컨테이너 1개당
_UNLOADING_FEE: dict[str, int] = {
    "20ft": 15_700,
    "40ft": 21_100,
    "45ft": 21_100,
}

# 기본 장치료 (10일 이내), 일반품, 컨테이너 1개당
_STORAGE_FEE: dict[str, int] = {
    "20ft": 7_100,
    "40ft": 9_800,
    "45ft": 9_800,
}

INFO_INPUT_FEE = 500   # 정보입력료 (전산 접수 1건당)
PASS_FEE = 1_500       # 출입증 발급수수료 (1장당)
VAT_RATE = Decimal("0.1")


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
    basis: str    # 산출 기준
    note: str     # 비고
    amount: int   # KRW, VAT 미포함


def calculate_domestic(
    containers: list[tuple[str, int]],
    passes: int = 0,
) -> tuple[list[DomesticItem], Decimal, Decimal]:
    """
    국내 구간 (오봉역 → 부산항, 450km) 운임 산정.

    Args:
        containers: [(container_type, quantity), ...]  예: [("40ft Dry (FEU)", 3)]
        passes: 출입증 발급 매수 (기본 0)

    Returns:
        (line_items, pre_vat_total, total_with_vat)
        line_items 마지막 항목이 VAT 행.
    """
    items: list[DomesticItem] = []

    # 규격별 수량 집계
    size_qty: dict[str, int] = {}
    for ct, qty in containers:
        key = _size_key(ct)
        size_qty[key] = size_qty.get(key, 0) + qty

    # 1. 기본 철도 운송 운임
    for size, qty in size_qty.items():
        per_unit = _round100(_FREIGHT_RATE[size] * DISTANCE_KM)
        items.append(DomesticItem(
            item_name=f"철도 운송 운임 ({size})",
            basis=f"{size} {_FREIGHT_RATE[size]:,}원/km × {DISTANCE_KM}km × {qty}개",
            note="공시 요율",
            amount=per_unit * qty,
        ))

    # 2. 하역요금 (부산진역 CY, 일반품)
    for size, qty in size_qty.items():
        fee = _UNLOADING_FEE[size]
        items.append(DomesticItem(
            item_name=f"하역 요금 ({size}, 일반품)",
            basis=f"{fee:,}원/개 × {qty}개",
            note="하역 요율",
            amount=fee * qty,
        ))

    # 3. 기본 장치료 (10일 이내)
    for size, qty in size_qty.items():
        fee = _STORAGE_FEE[size]
        items.append(DomesticItem(
            item_name=f"기본 장치료 ({size}, 10일 이내)",
            basis=f"{fee:,}원/개 × {qty}개",
            note="정액 요금",
            amount=fee * qty,
        ))

    # 4. 정보입력료 (1 신청 = 1건)
    items.append(DomesticItem(
        item_name="정보입력료",
        basis="전산 접수 1건",
        note="건당 500원",
        amount=INFO_INPUT_FEE,
    ))

    # 5. 출입증 발급수수료 (선택)
    if passes > 0:
        items.append(DomesticItem(
            item_name="출입증 발급수수료",
            basis=f"{passes}장",
            note="장당 1,500원",
            amount=PASS_FEE * passes,
        ))

    pre_vat = Decimal(sum(it.amount for it in items))
    vat_amount = (pre_vat * VAT_RATE).to_integral_value()
    total_with_vat = pre_vat + vat_amount

    items.append(DomesticItem(
        item_name="부가세 (VAT 10%)",
        basis="과세표준 합계 × 10%",
        note="",
        amount=int(vat_amount),
    ))

    return items, pre_vat, total_with_vat
