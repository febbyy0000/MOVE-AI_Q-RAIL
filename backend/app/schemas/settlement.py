from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
from app.models.enums import SectionCategory


class SettlementCreate(BaseModel):
    section_category: SectionCategory
    item_name: str
    basis: Optional[str] = None
    note: Optional[str] = None
    currency: str = "KRW"
    actual_amount: Decimal = Decimal("0.00")
    exchange_rate: Optional[Decimal] = None
    krw_actual_amount: Decimal = Decimal("0.00")


class SettlementUpdate(BaseModel):
    item_name: Optional[str] = None
    basis: Optional[str] = None
    note: Optional[str] = None
    currency: Optional[str] = None
    actual_amount: Optional[Decimal] = None
    exchange_rate: Optional[Decimal] = None
    krw_actual_amount: Optional[Decimal] = None


class SettlementResponse(BaseModel):
    id: int
    quote_id: str
    section_category: SectionCategory
    item_name: str
    basis: Optional[str]
    note: Optional[str]
    currency: str
    actual_amount: Decimal
    exchange_rate: Optional[Decimal]
    krw_actual_amount: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}
