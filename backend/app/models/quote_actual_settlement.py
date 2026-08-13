from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, BigInteger, DECIMAL, DateTime, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import SectionCategory


class QuoteActualSettlement(Base):
    """관리자가 A-03에서 입력한 실제 운행 정산 내역.

    A-03 동적 CRUD 한 행에 대응하며, A-04 정산서 명세표로 출력된다.
    AI 견적(ai_details)과 달리 실비는 단일 금액으로 확정된다.
    """

    __tablename__ = "settlements"
    __table_args__ = {"comment": "실제 운행 정산 세부 내역 (A-03 입력 / A-04 출력)"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, comment="자동증가 PK")
    quote_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("quotes.id", ondelete="CASCADE"),
        comment="견적 ID → quotes.id",
    )
    section_category: Mapped[SectionCategory] = mapped_column(
        SAEnum(SectionCategory),
        comment="대구간 구분 (DOMESTIC/OVERSEAS_HORGAS/OVERSEAS_DEST/OTHER)",
    )
    item_name: Mapped[str] = mapped_column(String(100), comment="정산 항목명 (예: TCR 대륙철도 운임)")
    basis: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment="산출 기준 (예: 연운항→호르고스 $2,950)")
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment="비고 (예: 변동 가능, 공시 요율)")
    currency: Mapped[str] = mapped_column(String(10), default="KRW", comment="통화 단위 (KRW / USD / CNY 등)")
    actual_amount: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), default=Decimal("0.00"), comment="원가 기준 정산 금액 (currency 단위)")
    exchange_rate: Mapped[Optional[Decimal]] = mapped_column(
        DECIMAL(10, 4), nullable=True,
        comment="정산 시점 적용 환율 KRW/외화 (KRW 항목은 NULL)",
    )
    krw_actual_amount: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), default=Decimal("0.00"), comment="원화 환산 정산 금액 (actual_amount × exchange_rate)")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, comment="등록일시")

    quote: Mapped["QuoteRequest"] = relationship(back_populates="settlements")
