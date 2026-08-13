import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Date, DateTime, DECIMAL, ForeignKey, JSON
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import QuoteStatus


class QuoteRequest(Base):
    """견적 요청 총괄 메인 테이블.

    quote_no는 사용자에게 노출되는 관리번호(Q-YYMMDD-XXXX)이며,
    내부 FK는 UUID 기반 id를 사용한다.
    """

    __tablename__ = "quotes"
    __table_args__ = {"comment": "견적 요청 및 정산 총괄 메인 테이블"}

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
        comment="UUID 기본키 (내부 FK 참조용)",
    )
    quote_no: Mapped[str] = mapped_column(
        String(30), unique=True,
        comment="사용자 노출 관리번호 (예: Q-260915-0031)",
    )
    shipper_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        comment="신청 화주(포워딩사) ID → users.id",
    )
    departure: Mapped[str] = mapped_column(
        String(50), default="오봉역",
        comment="출발지 (기본값: 오봉역 고정)",
    )
    destination: Mapped[str] = mapped_column(
        String(50),
        comment="도착지 (알마티 / 타슈켄트)",
    )
    dispatch_date: Mapped[date] = mapped_column(Date, comment="운송 희망일")
    status: Mapped[QuoteStatus] = mapped_column(
        SAEnum(QuoteStatus), default=QuoteStatus.CALCULATING,
        comment="운행 상태 (CALCULATING→ESTIMATED→MOVING→ARRIVED→SETTLEMENT_COMPLETED)",
    )
    exchange_rate: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), default=Decimal("1408.00"),
        comment="적용 환율 KRW/USD (서울외환시장 당일 종가 기준)",
    )
    ai_overseas_usd_min: Mapped[Optional[Decimal]] = mapped_column(
        DECIMAL(12, 2), nullable=True,
        comment="AI 해외 구간 예상 최소 USD (SVR 예측값, 환율 변동 무관)",
    )
    ai_overseas_usd_max: Mapped[Optional[Decimal]] = mapped_column(
        DECIMAL(12, 2), nullable=True,
        comment="AI 해외 구간 예상 최대 USD (SVR 예측값, 환율 변동 무관)",
    )
    ai_total_krw_min: Mapped[Optional[Decimal]] = mapped_column(
        DECIMAL(15, 2), nullable=True,
        comment="AI 예상 최소 원화 총액 (국내 + 해외 환산 합산)",
    )
    ai_total_krw_max: Mapped[Optional[Decimal]] = mapped_column(
        DECIMAL(15, 2), nullable=True,
        comment="AI 예상 최대 원화 총액 (국내 + 해외 환산 합산)",
    )
    actual_total_krw: Mapped[Optional[Decimal]] = mapped_column(
        DECIMAL(15, 2), nullable=True,
        comment="실제 정산 총액 (A-03 입력 후 확정)",
    )
    error_rate: Mapped[Optional[Decimal]] = mapped_column(
        DECIMAL(5, 2), nullable=True,
        comment="AI 예상 대비 실정산 오차율 (%)",
    )
    calc_log: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="견적 산정 과정 로그 (입력값·수식·Gemini 응답 포함)",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, comment="견적 신청일시")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow,
        comment="최종 수정일시",
    )

    shipper: Mapped["User"] = relationship(back_populates="quotes")
    containers: Mapped[list["QuoteContainer"]] = relationship(back_populates="quote", cascade="all, delete-orphan")
    ai_details: Mapped[list["QuoteAIDetail"]] = relationship(back_populates="quote", cascade="all, delete-orphan")
    settlements: Mapped[list["QuoteActualSettlement"]] = relationship(back_populates="quote", cascade="all, delete-orphan")
