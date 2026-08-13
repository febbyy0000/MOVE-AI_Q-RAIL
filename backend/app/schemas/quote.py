from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, field_validator
from app.models.enums import QuoteStatus, SectionCategory
from app.core.config import settings

_DEST_NORMALIZE: dict[str, str] = {
    "호르고스": "horgos",
    "알마티":   "almaty",
    "타슈켄트": "tashkent",
}
_VALID_DESTINATIONS = {"horgos", "almaty", "tashkent"}


class ContainerCreate(BaseModel):
    container_type: str
    quantity: int = 1
    item_name: str
    hs_code: Optional[str] = None


class ContainerResponse(BaseModel):
    id: int
    container_type: str
    quantity: int
    item_name: str
    hs_code: Optional[str]

    model_config = {"from_attributes": True}


class AIDetailResponse(BaseModel):
    id: int
    section_category: SectionCategory
    item_name: str
    basis: Optional[str]
    note: Optional[str]
    currency: str
    amount_min: Decimal
    amount_max: Decimal
    krw_amount_min: Decimal
    krw_amount_max: Decimal

    model_config = {"from_attributes": True}


class QuoteCreate(BaseModel):
    shipper_id: str
    destination: str
    dispatch_date: date
    exchange_rate: Decimal = settings.DEFAULT_EXCHANGE_RATE
    exchange_rate_date: Optional[date] = None
    containers: list[ContainerCreate]

    @field_validator("destination", mode="before")
    @classmethod
    def normalize_destination(cls, v: str) -> str:
        normalized = _DEST_NORMALIZE.get(v, v.lower().strip())
        if normalized not in _VALID_DESTINATIONS:
            raise ValueError(
                f"지원하지 않는 목적지: '{v}'. "
                f"허용 값: {sorted(_VALID_DESTINATIONS)}"
            )
        return normalized


class QuoteStatusUpdate(BaseModel):
    status: QuoteStatus


class QuoteResponse(BaseModel):
    id: str
    quote_no: str
    shipper_id: str
    departure: str
    destination: str
    dispatch_date: date
    status: QuoteStatus
    exchange_rate: Decimal
    exchange_rate_date: Optional[date]
    ai_overseas_usd_min: Optional[Decimal]
    ai_overseas_usd_max: Optional[Decimal]
    ai_total_krw_min: Optional[Decimal]
    ai_total_krw_max: Optional[Decimal]
    actual_total_krw: Optional[Decimal]
    error_rate: Optional[Decimal]
    created_at: datetime
    updated_at: datetime
    containers: list[ContainerResponse] = []
    ai_details: list[AIDetailResponse] = []

    model_config = {"from_attributes": True}
