from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
from app.models.enums import QuoteStatus, SectionCategory


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
    containers: list[ContainerCreate]


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
