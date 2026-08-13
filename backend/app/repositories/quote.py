from datetime import date

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import QuoteStatus
from app.models.quote_request import QuoteRequest
from app.models.user import User

_FULL_LOAD = [
    selectinload(QuoteRequest.shipper),
    selectinload(QuoteRequest.containers),
    selectinload(QuoteRequest.ai_details),
    selectinload(QuoteRequest.settlements),
]


class QuoteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, quote_id: str) -> QuoteRequest | None:
        result = await self.db.execute(
            select(QuoteRequest)
            .options(*_FULL_LOAD)
            .where(QuoteRequest.id == quote_id)
        )
        return result.scalar_one_or_none()

    async def get_by_quote_no(self, quote_no: str) -> QuoteRequest | None:
        result = await self.db.execute(
            select(QuoteRequest)
            .options(*_FULL_LOAD)
            .where(QuoteRequest.quote_no == quote_no)
        )
        return result.scalar_one_or_none()

    async def get_by_shipper(self, shipper_id: str) -> list[QuoteRequest]:
        result = await self.db.execute(
            select(QuoteRequest)
            .options(*_FULL_LOAD)
            .where(QuoteRequest.shipper_id == shipper_id)
            .order_by(QuoteRequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_all(self) -> list[QuoteRequest]:
        result = await self.db.execute(
            select(QuoteRequest)
            .options(*_FULL_LOAD)
            .order_by(QuoteRequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_with_filters(
        self,
        q: str | None = None,
        status: QuoteStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> list[QuoteRequest]:
        stmt = (
            select(QuoteRequest)
            .join(QuoteRequest.shipper)
            .options(*_FULL_LOAD)
        )

        filters = []
        if q:
            filters.append(
                or_(
                    QuoteRequest.quote_no.ilike(f"%{q}%"),
                    User.company.ilike(f"%{q}%"),
                )
            )
        if status:
            filters.append(QuoteRequest.status == status)
        if date_from:
            filters.append(QuoteRequest.created_at >= date_from)
        if date_to:
            filters.append(QuoteRequest.created_at <= date_to)

        if filters:
            stmt = stmt.where(and_(*filters))

        _SORTABLE = {"quote_no", "created_at", "status", "dispatch_date"}
        col = getattr(QuoteRequest, sort_by if sort_by in _SORTABLE else "created_at")
        stmt = stmt.order_by(col.asc() if sort_dir == "asc" else col.desc())

        result = await self.db.execute(stmt)
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
