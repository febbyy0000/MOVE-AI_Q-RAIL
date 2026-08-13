from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.enums import QuoteStatus, SectionCategory
from app.schemas.quote import ContainerResponse
from app.schemas.settlement import SettlementResponse


class QuoteSectionItem(BaseModel):
    """ai_details 한 행에 대응. 통화(currency)와 원래 금액만 내려주고, KRW 환산은 프론트에서."""
    item_name: str
    basis: Optional[str]
    note: Optional[str]
    currency: str        # "KRW" or "USD"
    amount_min: Decimal  # currency 단위 최솟값
    amount_max: Decimal  # currency 단위 최댓값


class QuoteSections(BaseModel):
    """ai_details를 3개 대구간으로 그룹핑한 구조."""
    domestic: list[QuoteSectionItem] = []
    overseas: list[QuoteSectionItem] = []
    other: list[QuoteSectionItem] = []


class AdminQuoteListItem(BaseModel):
    quote_no: str
    company: str
    shipper_name: str
    destination: str
    dispatch_date: date
    status: QuoteStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminQuoteDetail(BaseModel):
    id: str
    quote_no: str
    company: str
    shipper_name: str
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
    sections: QuoteSections = QuoteSections()
    settlements: list[SettlementResponse] = []

    model_config = {"from_attributes": True}


class SettlementFinalizeItem(BaseModel):
    section_category: SectionCategory
    item_name: str
    basis: Optional[str] = None
    note: Optional[str] = None
    currency: str = "KRW"
    actual_amount: Decimal = Decimal("0.00")
    exchange_rate: Optional[Decimal] = None
    krw_actual_amount: Decimal = Decimal("0.00")


class SettlementFinalizeRequest(BaseModel):
    items: list[SettlementFinalizeItem]
    actual_total_krw: Decimal


class InvoiceUploadResponse(BaseModel):
    quote_no: str
    filename: str
    saved_path: str
    size_bytes: int
