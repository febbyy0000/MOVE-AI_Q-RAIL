from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.settlement import SettlementCreate, SettlementUpdate, SettlementResponse
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
