from decimal import Decimal
from typing import Optional

from sqlalchemy import String, BigInteger, DECIMAL, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import SectionCategory


class QuoteAIDetail(Base):
    """AI가 산출한 사전 견적 세부 명세.

    U-03/A-02 화면의 아코디언 명세표 한 행에 대응한다.
    금액은 min/max 범위로 저장 (AI 예측 불확실성 반영).
    """

    __tablename__ = "ai_details"
    __table_args__ = {"comment": "AI 사전 견적 세부 명세 (U-03/A-02 아코디언 행)"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, comment="자동증가 PK")
    quote_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("quotes.id", ondelete="CASCADE"),
        comment="견적 ID → quotes.id",
    )
    section_category: Mapped[SectionCategory] = mapped_column(
        SAEnum(SectionCategory),
        comment="대구간 구분 (DOMESTIC/OVERSEAS_HORGAS/OVERSEAS_DEST/OTHER)",
    )
    item_name: Mapped[str] = mapped_column(String(100), comment="세부 항목명 (예: 철도 송도 운임)")
    basis: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment="산출 기준 (예: 40ft x 3개 450km)")
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment="비고 (예: 공시 요율, 변동 가능)")
    currency: Mapped[str] = mapped_column(String(10), default="KRW", comment="통화 (KRW / USD)")
    amount_min: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), comment="최소 예상 금액")
    amount_max: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), comment="최대 예상 금액")
    krw_amount_min: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), comment="원화 환산 최솟값")
    krw_amount_max: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), comment="원화 환산 최댓값")

    quote: Mapped["QuoteRequest"] = relationship(back_populates="ai_details")
