from typing import Optional

from sqlalchemy import String, Integer, BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class QuoteContainer(Base):
    """견적 요청별 컨테이너 규격 및 품목 상세.

    하나의 견적(quote)에 복수의 컨테이너 행이 붙는 1:N 구조.
    """

    __tablename__ = "containers"
    __table_args__ = {"comment": "견적별 컨테이너 규격·수량·품목 (1:N)"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, comment="자동증가 PK")
    quote_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("quotes.id", ondelete="CASCADE"),
        comment="견적 ID → quotes.id",
    )
    container_type: Mapped[str] = mapped_column(
        String(20),
        comment="컨테이너 규격 (20ft Dry / 40ft Dry / 45ft High Cube)",
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, comment="수량")
    item_name: Mapped[str] = mapped_column(String(200), comment="품목명 (예: 자동차 부품 - 브레이크 패드)")
    hs_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, comment="HS Code (추후 확장용)")

    quote: Mapped["QuoteRequest"] = relationship(back_populates="containers")
