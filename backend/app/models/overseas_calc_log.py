from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Integer, BigInteger, DECIMAL, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OverseasCalcLog(Base):
    """해외 운임 계산 이력 테이블.

    견적 생성 시 overseas_calc.py가 수행한 계산의 입력·출력·근거를 기록한다.
    앵커 단가 변경 추적, 오차 분석, 향후 모델 보정에 사용한다.
    """

    __tablename__ = "overseas_calc_log"
    __table_args__ = {"comment": "해외 운임 계산 이력 (앵커 기반 계산 audit trail)"}

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True, comment="PK"
    )
    quote_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("quotes.id", ondelete="CASCADE"),
        comment="견적 ID → quotes.id",
    )

    # ── 사용된 앵커 정보 ─────────────────────────────────────────
    anchor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("overseas_rate_anchors.id", ondelete="SET NULL"),
        nullable=True,
        comment="사용된 앵커 단가 ID → overseas_rate_anchors.id (NULL=상수 폴백)",
    )
    destination: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="목적지 코드"
    )
    anchor_usd: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False, comment="적용된 앵커 단가 USD/40ft"
    )
    volatility: Mapped[Decimal] = mapped_column(
        DECIMAL(5, 4), nullable=False, comment="적용된 변동폭"
    )
    anchor_confirmed: Mapped[bool] = mapped_column(
        default=False, comment="앵커 확정 여부"
    )

    # ── 계산 입력 ────────────────────────────────────────────────
    quantity: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="40ft 컨테이너 수량"
    )
    exchange_rate: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False, comment="적용 환율 KRW/USD"
    )
    fx_band: Mapped[Decimal] = mapped_column(
        DECIMAL(5, 4), nullable=False, comment="환율 밴드 (예: 0.0150 = ±1.5%)"
    )

    # ── 계산 결과 ────────────────────────────────────────────────
    usd_base: Mapped[Decimal] = mapped_column(
        DECIMAL(12, 2), nullable=False, comment="기준 USD (변동폭 미적용)"
    )
    usd_min: Mapped[Decimal] = mapped_column(
        DECIMAL(12, 2), nullable=False, comment="최소 USD (변동폭 하한)"
    )
    usd_max: Mapped[Decimal] = mapped_column(
        DECIMAL(12, 2), nullable=False, comment="최대 USD (변동폭 상한)"
    )
    krw_min: Mapped[Decimal] = mapped_column(
        DECIMAL(15, 2), nullable=False, comment="최소 KRW (환율밴드 하한 적용)"
    )
    krw_max: Mapped[Decimal] = mapped_column(
        DECIMAL(15, 2), nullable=False, comment="최대 KRW (환율밴드 상한 적용)"
    )

    # ── 계산 단계 로그 ───────────────────────────────────────────
    calc_steps: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True,
        comment="단계별 계산 과정 (근거 패널 표시용 steps 배열)",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, comment="계산 일시"
    )
