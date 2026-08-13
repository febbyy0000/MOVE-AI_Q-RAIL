from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quote_request import QuoteRequest


class QuoteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, quote_id: str) -> QuoteRequest | None:
        result = await self.db.execute(
            select(QuoteRequest)
            .options(
                selectinload(QuoteRequest.containers),
                selectinload(QuoteRequest.ai_details),
                selectinload(QuoteRequest.settlements),
            )
            .where(QuoteRequest.id == quote_id)
        )
        return result.scalar_one_or_none()

    async def get_by_quote_no(self, quote_no: str) -> QuoteRequest | None:
        result = await self.db.execute(
            select(QuoteRequest)
            .options(
                selectinload(QuoteRequest.containers),
                selectinload(QuoteRequest.ai_details),
                selectinload(QuoteRequest.settlements),
            )
            .where(QuoteRequest.quote_no == quote_no)
        )
        return result.scalar_one_or_none()

    async def get_by_shipper(self, shipper_id: str) -> list[QuoteRequest]:
        result = await self.db.execute(
            select(QuoteRequest)
            .options(selectinload(QuoteRequest.containers))
            .where(QuoteRequest.shipper_id == shipper_id)
            .order_by(QuoteRequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_all(self) -> list[QuoteRequest]:
        result = await self.db.execute(
            select(QuoteRequest)
            .options(selectinload(QuoteRequest.containers))
            .order_by(QuoteRequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, quote: QuoteRequest) -> QuoteRequest:
        self.db.add(quote)
        await self.db.commit()
        await self.db.refresh(quote)
        return quote

    async def update(self, quote: QuoteRequest) -> QuoteRequest:
        await self.db.commit()
        await self.db.refresh(quote)
        return quote
