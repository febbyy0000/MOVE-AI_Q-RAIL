import json
import uuid
from asyncio import CancelledError
from datetime import datetime
from decimal import Decimal
from typing import AsyncGenerator

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import QuoteStatus, SectionCategory
from app.models.quote_ai_detail import QuoteAIDetail
from app.models.quote_container import QuoteContainer
from app.models.quote_request import QuoteRequest
from app.repositories.quote import QuoteRepository
from app.schemas.quote import QuoteCreate, QuoteResponse, QuoteStatusUpdate
from app.services.domestic_calc import calculate_domestic
from app.services.overseas_calc import predict_overseas_quote, save_calc_log


class QuoteService:
    def __init__(self, db: AsyncSession):
        self.repo = QuoteRepository(db)

    def _generate_quote_no(self) -> str:
        import random
        now = datetime.utcnow()
        return f"Q-{now.strftime('%y%m%d')}-{random.randint(1, 9999):04d}"

    async def create(self, data: QuoteCreate) -> QuoteRequest:
        quote = QuoteRequest(
            id=str(uuid.uuid4()),
            quote_no=self._generate_quote_no(),
            shipper_id=data.shipper_id,
            destination=data.destination,
            dispatch_date=data.dispatch_date,
            exchange_rate=data.exchange_rate,
        )

        containers_for_calc: list[tuple[str, int]] = []
        for c in data.containers:
            quote.containers.append(
                QuoteContainer(
                    container_type=c.container_type,
                    quantity=c.quantity,
                    item_name=c.item_name,
                    hs_code=c.hs_code,
                )
            )
            containers_for_calc.append((c.container_type, c.quantity))

        # 1. 국내 구간 운임 산정 (오봉역 → 부산항)
        domestic_items, _, domestic_total = calculate_domestic(containers_for_calc)
        for item in domestic_items:
            amt = Decimal(item.amount)
            quote.ai_details.append(
                QuoteAIDetail(
                    section_category=SectionCategory.DOMESTIC,
                    item_name=item.item_name,
                    basis=item.basis,
                    note=item.note,
                    currency="KRW",
                    amount_min=amt,
                    amount_max=amt,
                    krw_amount_min=amt,
                    krw_amount_max=amt,
                )
            )

        # 2. 해외 구간(TCR) 잠정 운임 산정 (CRIMT 앵커 + Gemini HS Code 분류)
        item_name = data.containers[0].item_name if data.containers else "일반 화물"
        overseas = await predict_overseas_quote(
            db=self.repo.db,
            containers=containers_for_calc,
            item_name=item_name,
            destination=data.destination,
            exchange_rate=data.exchange_rate,
            quote_id=quote.id,
        )
        for item in overseas.items:
            quote.ai_details.append(
                QuoteAIDetail(
                    section_category=item.section_category,
                    item_name=item.item_name,
                    basis=item.basis,
                    note=item.note,
                    currency=item.currency,
                    amount_min=item.amount_min,
                    amount_max=item.amount_max,
                    krw_amount_min=item.krw_min,
                    krw_amount_max=item.krw_max,
                )
            )

        # LLM이 HS Code를 산출했고 컨테이너에 HS Code가 없는 경우 자동 반영
        if overseas.analysis.hs_code not in ("0000.00", ""):
            for container in quote.containers:
                if not container.hs_code:
                    container.hs_code = overseas.analysis.hs_code

        quote.ai_overseas_usd_min = overseas.usd_min
        quote.ai_overseas_usd_max = overseas.usd_max
        quote.ai_total_krw_min = domestic_total + overseas.krw_min
        quote.ai_total_krw_max = domestic_total + overseas.krw_max
        quote.status = QuoteStatus.ESTIMATED

        # 계산 과정 로그 저장 (calc_log JSON)
        quote.calc_log = {
            "request": {
                "destination": data.destination,
                "dispatch_date": str(data.dispatch_date),
                "exchange_rate": float(data.exchange_rate),
                "containers": [
                    {"type": c.container_type, "qty": c.quantity, "item": c.item_name}
                    for c in data.containers
                ],
            },
            "domestic": {
                "formula": "코레일 공시요율 × 450km + 하역료 + 장치료 + 정보입력료 + VAT 10%",
                "items": [
                    {"name": it.item_name, "basis": it.basis, "amount_krw": it.amount}
                    for it in domestic_items
                ],
                "total_krw": int(domestic_total),
            },
            "overseas": {
                "formula": "CRIMT 앵커 단가 × 수량 × (1 ± 변동폭) × 환율 × (1 ± 환율밴드)",
                "anchor_confirmed": overseas.anchor_confirmed,
                "volatility_pct": float(overseas.error_rate * 100),
                "exchange_rate": float(data.exchange_rate),
                "usd_base": float(overseas.usd_base),
                "usd_min": float(overseas.usd_min),
                "usd_max": float(overseas.usd_max),
                "krw_min": int(overseas.krw_min),
                "krw_max": int(overseas.krw_max),
                "steps": overseas.calc_steps or [],
            },
            "gemini": {
                "called": overseas.analysis.gemini_used,
                "hs_code": overseas.analysis.hs_code,
                "item_category": overseas.analysis.item_category,
                "is_hazardous": overseas.analysis.is_hazardous,
            },
        }

        saved = await self.repo.create(quote)
        # quote 저장 후 해외 운임 계산 이력 적재
        await save_calc_log(self.repo.db, saved.id, data.destination, overseas)
        # 관계(containers, ai_details) 포함해서 다시 로드
        return await self.repo.get_by_id(saved.id)

    async def create_stream(self, data: QuoteCreate) -> AsyncGenerator[str, None]:
        def _sse(payload: dict) -> str:
            return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

        try:
            quote = QuoteRequest(
                id=str(uuid.uuid4()),
                quote_no=self._generate_quote_no(),
                shipper_id=data.shipper_id,
                destination=data.destination,
                dispatch_date=data.dispatch_date,
                exchange_rate=data.exchange_rate,
            )

            containers_for_calc: list[tuple[str, int]] = []
            for c in data.containers:
                quote.containers.append(
                    QuoteContainer(
                        container_type=c.container_type,
                        quantity=c.quantity,
                        item_name=c.item_name,
                        hs_code=c.hs_code,
                    )
                )
                containers_for_calc.append((c.container_type, c.quantity))

            # 1. 국내 구간
            domestic_items, _, domestic_total = calculate_domestic(containers_for_calc)
            for item in domestic_items:
                amt = Decimal(item.amount)
                quote.ai_details.append(
                    QuoteAIDetail(
                        section_category=SectionCategory.DOMESTIC,
                        item_name=item.item_name,
                        basis=item.basis,
                        note=item.note,
                        currency="KRW",
                        amount_min=amt,
                        amount_max=amt,
                        krw_amount_min=amt,
                        krw_amount_max=amt,
                    )
                )
            yield _sse({"step": "domestic"})

            # 2. 해외 구간 (CRIMT 앵커 + Gemini)
            item_name = data.containers[0].item_name if data.containers else "일반 화물"
            overseas = await predict_overseas_quote(
                db=self.repo.db,
                containers=containers_for_calc,
                item_name=item_name,
                destination=data.destination,
                exchange_rate=data.exchange_rate,
                quote_id=quote.id,
            )
            for item in overseas.items:
                quote.ai_details.append(
                    QuoteAIDetail(
                        section_category=item.section_category,
                        item_name=item.item_name,
                        basis=item.basis,
                        note=item.note,
                        currency=item.currency,
                        amount_min=item.amount_min,
                        amount_max=item.amount_max,
                        krw_amount_min=item.krw_min,
                        krw_amount_max=item.krw_max,
                    )
                )
            if overseas.analysis.hs_code not in ("0000.00", ""):
                for container in quote.containers:
                    if not container.hs_code:
                        container.hs_code = overseas.analysis.hs_code

            quote.ai_overseas_usd_min = overseas.usd_min
            quote.ai_overseas_usd_max = overseas.usd_max
            quote.ai_total_krw_min = domestic_total + overseas.krw_min
            quote.ai_total_krw_max = domestic_total + overseas.krw_max
            quote.status = QuoteStatus.ESTIMATED
            quote.calc_log = {
                "request": {
                    "destination": data.destination,
                    "dispatch_date": str(data.dispatch_date),
                    "exchange_rate": float(data.exchange_rate),
                    "containers": [
                        {"type": c.container_type, "qty": c.quantity, "item": c.item_name}
                        for c in data.containers
                    ],
                },
                "domestic": {
                    "formula": "코레일 공시요율 × 450km + 하역료 + 장치료 + 정보입력료 + VAT 10%",
                    "items": [
                        {"name": it.item_name, "basis": it.basis, "amount_krw": it.amount}
                        for it in domestic_items
                    ],
                    "total_krw": int(domestic_total),
                },
                "overseas": {
                    "formula": "CRIMT 앵커 단가 × 수량 × (1 ± 변동폭) × 환율 × (1 ± 환율밴드)",
                    "anchor_confirmed": overseas.anchor_confirmed,
                    "volatility_pct": float(overseas.error_rate * 100),
                    "exchange_rate": float(data.exchange_rate),
                    "usd_base": float(overseas.usd_base),
                    "usd_min": float(overseas.usd_min),
                    "usd_max": float(overseas.usd_max),
                    "krw_min": int(overseas.krw_min),
                    "krw_max": int(overseas.krw_max),
                    "steps": overseas.calc_steps or [],
                },
                "gemini": {
                    "called": overseas.analysis.gemini_used,
                    "hs_code": overseas.analysis.hs_code,
                    "item_category": overseas.analysis.item_category,
                    "is_hazardous": overseas.analysis.is_hazardous,
                },
            }
            yield _sse({"step": "overseas"})

            # 3. 저장 후 완료
            saved = await self.repo.create(quote)
            await save_calc_log(self.repo.db, saved.id, data.destination, overseas)
            result = await self.repo.get_by_id(saved.id)
            yield _sse({"step": "complete", "quote": QuoteResponse.model_validate(result).model_dump(mode="json")})

        except Exception as exc:
            yield _sse({"step": "error", "detail": str(exc)})

    async def get(self, quote_no: str) -> QuoteRequest:
        quote = await self.repo.get_by_quote_no(quote_no)
        if not quote:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="견적을 찾을 수 없습니다.")
        return quote

    async def list_all(self) -> list[QuoteRequest]:
        return await self.repo.get_all()

    async def list_by_shipper(self, shipper_id: str) -> list[QuoteRequest]:
        return await self.repo.get_by_shipper(shipper_id)

    async def update_status(self, quote_no: str, data: QuoteStatusUpdate) -> QuoteRequest:
        quote = await self.repo.get_by_quote_no(quote_no)
        if not quote:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="견적을 찾을 수 없습니다.")
        quote.status = data.status
        return await self.repo.update(quote)
