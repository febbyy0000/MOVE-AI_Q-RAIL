import enum


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class QuoteStatus(str, enum.Enum):
    CALCULATING = "CALCULATING"        # AI 견적 산정 중 (U-02)
    ESTIMATED = "ESTIMATED"            # 견적 완료 / 운행 전 (A-01: 운행 전)
    MOVING = "MOVING"                  # 운행 중 (A-01: 운행 중)
    ARRIVED = "ARRIVED"                # 운행 완료 / 정산 대기 (A-01: 운행 완료)
    SETTLEMENT_COMPLETED = "SETTLEMENT_COMPLETED"  # 정산 완료 (A-01: 정산 완료)


class SectionCategory(str, enum.Enum):
    DOMESTIC = "DOMESTIC"              # 1. 국내 구간 (오봉역 → 부산항)
    OVERSEAS_HORGAS = "OVERSEAS_HORGAS"  # 2-1. 해외 구간 A (연운항 → 호르고스)
    OVERSEAS_DEST   = "OVERSEAS_DEST"    # 2-2. 해외 구간 B (호르고스 → 도착지)
    OTHER = "OTHER"                    # 3. 기타 부대비용
