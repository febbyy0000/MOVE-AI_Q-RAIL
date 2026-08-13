from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quote_actual_settlement import QuoteActualSettlement


class SettlementRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_quote_id(self, quote_id: str) -> list[QuoteActualSettlement]:
        result = await self.db.execute(
            select(QuoteActualSettlement)
            .where(QuoteActualSettlement.quote_id == quote_id)
            .order_by(QuoteActualSettlement.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id(self, settlement_id: int) -> QuoteActualSettlement | None:
        result = await self.db.execute(
            select(QuoteActualSettlement).where(QuoteActualSettlement.id == settlement_id)
        )
        return result.scalar_one_or_none()

    async def create(self, settlement: QuoteActualSettlement) -> QuoteActualSettlement:
        self.db.add(settlement)
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def update(self, settlement: QuoteActualSettlement) -> QuoteActualSettlement:
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def delete(self, settlement: QuoteActualSettlement) -> None:
        await self.db.delete(settlement)
        await self.db.commit()
