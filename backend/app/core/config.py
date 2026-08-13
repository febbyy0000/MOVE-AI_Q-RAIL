from decimal import Decimal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "MOVE AI API"
    DEBUG: bool = False

    DB_HOST: str
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    @property
    def DATABASE_URL(self) -> str:
        # Cloud Run + Cloud SQL은 DB_HOST가 /cloudsql/프로젝트:리전:인스턴스 형태의 유닉스 소켓 경로로 옴
        if self.DB_HOST.startswith("/cloudsql/"):
            return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@/{self.DB_NAME}?unix_socket={self.DB_HOST}&charset=utf8mb4"
        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    GEMINI_API_KEY: str = ""

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── 기본 환율 ─────────────────────────────────────────────────────────────
    # 서울외환시장 당일 종가 기준, 견적 요청 시 프론트에서 덮어씀
    DEFAULT_EXCHANGE_RATE: Decimal = Decimal("1408.00")

    # ── 국내 구간 운임 ────────────────────────────────────────────────────────
    DOMESTIC_DISTANCE_KM: int = 450          # 오봉역 → 부산항 고정 구간 거리
    DOMESTIC_INFO_INPUT_FEE: int = 500       # 정보입력료 (전산 접수 1건당)
    DOMESTIC_PASS_FEE: int = 1_500          # 출입증 발급수수료 (1장당)
    DOMESTIC_VAT_RATE: Decimal = Decimal("0.10")   # 부가세율

    # ── 기타 부대비용 ─────────────────────────────────────────────────────────
    FIATA_BL_FEE: int = 44_000              # FIATA B/L 서류발행비 (1건당 고정)

    # ── 해외 구간 환율 밴드 ───────────────────────────────────────────────────
    OVERSEAS_FX_BAND: Decimal = Decimal("0.0150")  # 환율 변동 ±1.5%

    class Config:
        env_file = ".env"


settings = Settings()
