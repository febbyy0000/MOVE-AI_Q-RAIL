from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.quote import QuoteCreate, QuoteResponse, QuoteStatusUpdate
from app.services.quote import QuoteService

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.post("/stream")
async def create_quote_stream(data: QuoteCreate, db: AsyncSession = Depends(get_db)):
    """견적 산정 SSE 스트림. step: domestic → overseas → complete | error"""
    return StreamingResponse(
        QuoteService(db).create_stream(data),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/", response_model=QuoteResponse, status_code=201)
async def create_quote(data: QuoteCreate, db: AsyncSession = Depends(get_db)):
    return await QuoteService(db).create(data)


@router.get("/", response_model=list[QuoteResponse])
async def list_quotes(shipper_id: str | None = None, db: AsyncSession = Depends(get_db)):
    if shipper_id:
        return await QuoteService(db).list_by_shipper(shipper_id)
    return await QuoteService(db).list_all()


@router.get("/{quote_no}", response_model=QuoteResponse)
async def get_quote(quote_no: str, db: AsyncSession = Depends(get_db)):
    return await QuoteService(db).get(quote_no)


@router.patch("/{quote_no}/status", response_model=QuoteResponse)
async def update_status(quote_no: str, data: QuoteStatusUpdate, db: AsyncSession = Depends(get_db)):
    return await QuoteService(db).update_status(quote_no, data)
