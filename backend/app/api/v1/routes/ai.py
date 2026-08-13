from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.ai import ItemClassifyRequest
from app.services.llm_invoice_parser import parse_invoice_bytes
from app.services.llm_item_classify import classify_item

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/classify-item")
async def classify_item_route(body: ItemClassifyRequest):
    """[U-01] 자연어 견적 요청 → 목적지/규격/수량/날짜 추출 + HS Code 추정"""
    try:
        return await classify_item(body.text, body.today)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/parse-invoice")
async def parse_invoice_route(file: UploadFile = File(...)):
    """[A-02] 인보이스 문서(PDF/PNG/JPEG) → 운임 데이터 + 규격계수 추출"""
    data = await file.read()
    try:
        return await parse_invoice_bytes(data, file.content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
