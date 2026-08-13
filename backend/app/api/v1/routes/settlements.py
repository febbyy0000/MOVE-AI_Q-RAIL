from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.settlement import SettlementCreate, SettlementUpdate, SettlementResponse
from app.services.llm_invoice_parser import parse_invoice_bytes
from app.services.settlement import SettlementService

router = APIRouter(prefix="/quotes/{quote_no}/settlements", tags=["settlements"])


@router.get("/", response_model=list[SettlementResponse])
async def list_settlements(quote_no: str, db: AsyncSession = Depends(get_db)):
    return await SettlementService(db).list_by_quote(quote_no)


@router.post("/", response_model=SettlementResponse, status_code=201)
async def create_settlement(quote_no: str, data: SettlementCreate, db: AsyncSession = Depends(get_db)):
    return await SettlementService(db).create(quote_no, data)


@router.patch("/{settlement_id}", response_model=SettlementResponse)
async def update_settlement(quote_no: str, settlement_id: int, data: SettlementUpdate, db: AsyncSession = Depends(get_db)):
    return await SettlementService(db).update(settlement_id, data)


@router.delete("/{settlement_id}", status_code=204)
async def delete_settlement(quote_no: str, settlement_id: int, db: AsyncSession = Depends(get_db)):
    await SettlementService(db).delete(settlement_id)


@router.post("/upload-invoice")
async def upload_settlement_invoice(
    quote_no: str,
    file: UploadFile = File(...),
):
    """[A-03] 정산 인보이스 업로드 → Gemini 파싱 결과 반환.

    파싱된 데이터를 클라이언트에서 검토 후 POST /settlements/ 로 저장한다.
    """
    data = await file.read()
    try:
        return await parse_invoice_bytes(data, file.content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
