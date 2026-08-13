from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Integer, DECIMAL, Boolean, Date, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ShippingRecordBase(Base):
    """TCR 해외 운임 실적 및 증강 데이터 (SVR 회귀 학습용).

    ┌──────────────────────────────────────────────────────────────┐
    │  Feature (X)   destination_code, container_size_code,        │
    │                quantity, shipping_month                       │
    │  Target  (Y)   actual_freight_usd                            │
    │  학습 표본 수  n = (실 정산 is_augmented=FALSE) + (증강 TRUE) │
    └──────────────────────────────────────────────────────────────┘

    증강 데이터는 scripts/augment_data.py 로 적재한다.
    실정산 데이터는 A-03 정산 완료 시 is_augmented=FALSE 로 추가된다.
    """

    __tablename__ = "shipping_record_base"
    __table_args__ = {"comment": "TCR 해외 운임 실적 및 증강 데이터 (SVR 회귀 학습용)"}

    record_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True,
        comment="실적 PK",
    )
    quote_id: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="연관 관리번호 Q-YYMMDD-XXXX (증강 데이터는 NULL)",
    )

    # ── Feature (X) 변수 ────────────────────────────────────────────
    route_section: Mapped[str] = mapped_column(
        String(20),
        comment="구간 구분: DOMESTIC / TCR_OVERSEAS",
    )
    destination_code: Mapped[int] = mapped_column(
        Integer,
        comment="도착지 수치 코드: 1=호르고스, 2=알마티, 3=타슈켄트",
    )
    container_size_code: Mapped[int] = mapped_column(
        Integer,
        comment="규격 코드: 20 / 40 / 45",
    )
    quantity: Mapped[int] = mapped_column(
        Integer, default=1,
        comment="컨테이너 수량",
    )
    shipping_month: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True,
        comment="운송 희망 월 1~12 (향후 계절성용, 현재 미활용)",
    )

    # ── 부가 정보 ────────────────────────────────────────────────────
    container_contents: Mapped[Optional[str]] = mapped_column(
        String(250), nullable=True,
        comment="화물 품목명",
    )
    forwarder_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True,
        comment="포워딩사명",
    )
    metadata_json: Mapped[Optional[dict]] = mapped_column(
        "metadata", JSON, nullable=True,
        comment="확장 부가정보 (자유 형식 JSON)",
    )

    # ── Target (Y) 변수 ─────────────────────────────────────────────
    actual_freight_usd: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2),
        comment="실제 발생 해외 TCR 운임 USD (SVR 예측 대상 Y)",
    )
    actual_total_krw: Mapped[Optional[Decimal]] = mapped_column(
        DECIMAL(15, 2), nullable=True,
        comment="전구간 최종 실정산 합계 원화 (옵션)",
    )

    # ── 데이터 품질 구분 ────────────────────────────────────────────
    is_augmented: Mapped[bool] = mapped_column(
        Boolean, default=True,
        comment="증강 데이터=TRUE / 실정산 실적=FALSE",
    )
    source: Mapped[str] = mapped_column(
        String(30), default="augmented",
        comment="데이터 출처: korail_official / augmented / actual",
    )
    settled_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="정산 확정일 (증강 데이터는 NULL 가능)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow,
    )
