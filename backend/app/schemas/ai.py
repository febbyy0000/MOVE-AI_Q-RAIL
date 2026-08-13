from typing import Optional
from pydantic import BaseModel


class ItemClassifyRequest(BaseModel):
    text: str
    today: Optional[str] = None


class HsGuess(BaseModel):
    code: str
    label: str
    confidence: float


class ItemClassifyResponse(BaseModel):
    destination: Optional[str] = None
    size: Optional[str] = None
    qty: Optional[int] = None
    date: Optional[str] = None
    item: Optional[str] = None
    hs_guess: Optional[HsGuess] = None
    missing: list[str]
    ready: bool


class InvoiceLineItem(BaseModel):
    unit_price_usd: float
    count: int


class InvoiceContainer(BaseModel):
    size: str
    count: int


class InvoiceParseResponse(BaseModel):
    invoice_no: Optional[str] = None
    date: Optional[str] = None
    containers: list[InvoiceContainer]
    lines: list[InvoiceLineItem]
    total_usd: Optional[float] = None
    groups: dict
    size_factor: Optional[float] = None
    line_sum: float
    warnings: list[str]
    blank_fields: list[str]
    media_type: str
