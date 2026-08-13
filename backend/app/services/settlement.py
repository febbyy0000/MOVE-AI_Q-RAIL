from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quote_actual_settlement import QuoteActualSettlement
from app.repositories.quote import QuoteRepository
from app.repositories.settlement import SettlementRepository
from app.schemas.settlement import SettlementCreate, SettlementUpdate


class SettlementService:
    def __init__(self, db: AsyncSession):
        self.repo = SettlementRepository(db)
        self.quote_repo = QuoteRepository(db)

    async def _resolve_quote_id(self, quote_no: str) -> str:
        quote = await self.quote_repo.get_by_quote_no(quote_no)
        if not quote:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="견적을 찾을 수 없습니다.")
        return quote.id

    async def create(self, quote_no: str, data: SettlementCreate) -> QuoteActualSettlement:
        quote_id = await self._resolve_quote_id(quote_no)
        settlement = QuoteActualSettlement(quote_id=quote_id, **data.model_dump())
        return await self.repo.create(settlement)

    async def list_by_quote(self, quote_no: str) -> list[QuoteActualSettlement]:
        quote_id = await self._resolve_quote_id(quote_no)
        return await self.repo.get_by_quote_id(quote_id)

    async def update(self, settlement_id: int, data: SettlementUpdate) -> QuoteActualSettlement:
        settlement = await self.repo.get_by_id(settlement_id)
        if not settlement:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="정산 항목을 찾을 수 없습니다.")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(settlement, field, value)
        return await self.repo.update(settlement)

    async def delete(self, settlement_id: int) -> None:
        settlement = await self.repo.get_by_id(settlement_id)
        if not settlement:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="정산 항목을 찾을 수 없습니다.")
        await self.repo.delete(settlement)
