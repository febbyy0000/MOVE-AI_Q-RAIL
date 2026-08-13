from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Integer, DECIMAL, Boolean, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OverseasRateAnchor(Base):
    """CRIMT 인보이스 기반 해외 운임 앵커 단가 원장.

    인보이스 파싱 결과 또는 KORAIL 견적서 확인값으로 적재된다.
    overseas_calc.py는 is_active=True 중 최신 행을 읽어 운임을 계산한다.
    """

    __tablename__ = "overseas_rate_anchors"
    __table_args__ = {"comment": "CRIMT 해외 운임 앵커 단가 원장 (인보이스/견적서 기반)"}

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, comment="PK"
    )
    destination: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="목적지 코드: horgos / almaty / tashkent",
    )
    anchor_usd: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False,
        comment="40ft 기준 앵커 단가 (USD)",
    )
    volatility: Mapped[Decimal] = mapped_column(
        DECIMAL(5, 4), nullable=False,
        comment="운임 변동폭 (예: 0.0250 = ±2.5%, KORAIL 시범운행 관측)",
    )
    confirmed: Mapped[bool] = mapped_column(
        Boolean, default=False,
        comment="KORAIL 견적서 일치 확인 여부 (False=소거법 추정)",
    )
    source_note: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True,
        comment="근거 노트 (예: KORAIL 견적서 2,400 일치)",
    )
    invoice_no: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="근거 CRIMT 인보이스 번호 (예: XS26061809165738556)",
    )
    invoice_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="인보이스 발행일",
    )
    raw_lines: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="LLM이 추출한 원본 라인 데이터 JSON (검증용)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True,
        comment="현재 적용 중인 단가 여부 (목적지별 최신 1행만 True)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, comment="등록일시"
    )
