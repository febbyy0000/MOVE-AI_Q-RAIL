import uuid
from datetime import datetime

from sqlalchemy import String, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import UserRole


class User(Base):
    """화주(포워딩사) 및 관리자 계정."""

    __tablename__ = "users"
    __table_args__ = {"comment": "화주(포워딩사) 및 관리자 계정 테이블"}

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()),
        comment="UUID 기본키",
    )
    company: Mapped[str] = mapped_column(String(100), comment="회사명 (예: 현대글로비스, 유신포워딩)")
    name: Mapped[str] = mapped_column(String(50), comment="담당자명")
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole), default=UserRole.USER,
        comment="권한 구분 (USER: 화주/포워딩사, ADMIN: 코레일 관리자)",
    )
    email: Mapped[str] = mapped_column(String(100), unique=True, comment="로그인 이메일")
    password_hash: Mapped[str] = mapped_column(String(255), comment="bcrypt 해시 비밀번호")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, comment="가입일시")

    quotes: Mapped[list["QuoteRequest"]] = relationship(back_populates="shipper")
