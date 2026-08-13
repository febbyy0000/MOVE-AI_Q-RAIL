"""관리자 전용 API (A-01 / A-02 / A-03 화면 대응)."""

import os
import shutil
import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.enums import QuoteStatus
from app.models.quote_actual_settlement import QuoteActualSettlement
from app.repositories.quote import QuoteRepository
from app.models.enums import SectionCategory
from app.schemas.admin import (
    AdminQuoteDetail,
    AdminQuoteListItem,
    InvoiceUploadResponse,
    QuoteSectionItem,
    QuoteSections,
    SettlementFinalizeRequest,
)
from app.schemas.quote import QuoteStatusUpdate

router = APIRouter(prefix="/admin", tags=["admin"])

# 인보이스 PDF 저장 기본 경로 (backend 디렉터리 기준)
_UPLOAD_BASE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "uploads", "invoices")

_OVERSEAS_CATEGORIES = {SectionCategory.OVERSEAS_HORGAS, SectionCategory.OVERSEAS_DEST}


def _build_sections(ai_details) -> QuoteSections:
    domestic, overseas, other = [], [], []
    for d in ai_details:
        item = QuoteSectionItem(
            item_name=d.item_name,
            basis=d.basis,
            note=d.note,
            currency=d.currency,
            amount_min=d.amount_min,
            amount_max=d.amount_max,
        )
        if d.section_category == SectionCategory.DOMESTIC:
            domestic.append(item)
        elif d.section_category in _OVERSEAS_CATEGORIES:
            overseas.append(item)
        else:
            other.append(item)
    return QuoteSections(domestic=domestic, overseas=overseas, other=other)


def _to_detail(quote) -> AdminQuoteDetail:
    return AdminQuoteDetail(
        id=quote.id,
        quote_no=quote.quote_no,
        company=quote.shipper.company,
        shipper_name=quote.shipper.name,
        departure=quote.departure,
        destination=quote.destination,
        dispatch_date=quote.dispatch_date,
        status=quote.status,
        exchange_rate=quote.exchange_rate,
        exchange_rate_date=quote.exchange_rate_date,
        ai_overseas_usd_min=quote.ai_overseas_usd_min,
        ai_overseas_usd_max=quote.ai_overseas_usd_max,
        ai_total_krw_min=quote.ai_total_krw_min,
        ai_total_krw_max=quote.ai_total_krw_max,
        actual_total_krw=quote.actual_total_krw,
        error_rate=quote.error_rate,
        created_at=quote.created_at,
        updated_at=quote.updated_at,
        containers=list(quote.containers),
        sections=_build_sections(quote.ai_details),
        settlements=list(quote.settlements),
    )


# ──────────────────────────────────────────────────────────────────────────────
# A-01  운행 이력 목록
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/quotes", response_model=list[AdminQuoteListItem], summary="[A-01] 운행 이력 목록")
async def list_admin_quotes(
    q: Optional[str] = Query(None, description="관리번호 또는 포워딩사명 검색"),
    status: Optional[QuoteStatus] = Query(None, description="운행 상태 필터"),
    date_from: Optional[date] = Query(None, description="요청일 시작 (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="요청일 종료 (YYYY-MM-DD)"),
    sort_by: str = Query("created_at", description="정렬 컬럼 (quote_no|created_at|status|dispatch_date)"),
    sort_dir: str = Query("desc", description="정렬 방향 (asc|desc)"),
    db: AsyncSession = Depends(get_db),
):
    repo = QuoteRepository(db)
    quotes = await repo.list_with_filters(
        q=q,
        status=status,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return [
        AdminQuoteListItem(
            quote_no=q_.quote_no,
            company=q_.shipper.company,
            shipper_name=q_.shipper.name,
            destination=q_.destination,
            dispatch_date=q_.dispatch_date,
            status=q_.status,
            created_at=q_.created_at,
        )
        for q_ in quotes
    ]


# ──────────────────────────────────────────────────────────────────────────────
# A-02  운행 상세 조회 (read-only)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/quotes/{quote_no}", response_model=AdminQuoteDetail, summary="[A-02] 운행 상세 조회")
async def get_admin_quote(quote_no: str, db: AsyncSession = Depends(get_db)):
    repo = QuoteRepository(db)
    quote = await repo.get_by_quote_no(quote_no)
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="견적을 찾을 수 없습니다.")
    return _to_detail(quote)


# ──────────────────────────────────────────────────────────────────────────────
# 운행 상태 변경 (BEFORE → MOVING → ARRIVED 등 수동 전환)
# ──────────────────────────────────────────────────────────────────────────────

@router.patch("/quotes/{quote_no}/status", response_model=AdminQuoteDetail, summary="운행 상태 변경")
async def update_quote_status(
    quote_no: str,
    data: QuoteStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    repo = QuoteRepository(db)
    quote = await repo.get_by_quote_no(quote_no)
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="견적을 찾을 수 없습니다.")
    quote.status = data.status
    await repo.update(quote)
    return _to_detail(quote)


# ──────────────────────────────────────────────────────────────────────────────
# A-03  정산 확정 (settlements 일괄 교체 + 상태 SETTLEMENT_COMPLETED)
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/quotes/{quote_no}/settlements/finalize",
    response_model=AdminQuoteDetail,
    status_code=200,
    summary="[A-03] 정산 실적 확정",
)
async def finalize_settlements(
    quote_no: str,
    data: SettlementFinalizeRequest,
    db: AsyncSession = Depends(get_db),
):
    """A-03 '실적 저장' 버튼: 기존 정산 항목을 전부 교체하고 상태를 SETTLEMENT_COMPLETED로 전환.

    - 기존 settlements 전체 삭제 후 재삽입
    - quotes.actual_total_krw 업데이트
    - quotes.error_rate 자동 계산 ((actual - ai_mid) / ai_mid * 100)
    - quotes.status = SETTLEMENT_COMPLETED
    """
    repo = QuoteRepository(db)
    quote = await repo.get_by_quote_no(quote_no)
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="견적을 찾을 수 없습니다.")

    # 기존 settlements 일괄 삭제
    await db.execute(
        delete(QuoteActualSettlement).where(QuoteActualSettlement.quote_id == quote.id)
    )

    # 새 항목 일괄 삽입
    for item in data.items:
        db.add(QuoteActualSettlement(quote_id=quote.id, **item.model_dump()))

    # quote 필드 갱신
    quote.actual_total_krw = data.actual_total_krw
    quote.status = QuoteStatus.SETTLEMENT_COMPLETED

    if quote.ai_total_krw_min is not None and quote.ai_total_krw_max is not None:
        ai_mid = (quote.ai_total_krw_min + quote.ai_total_krw_max) / Decimal("2")
        if ai_mid != 0:
            quote.error_rate = (data.actual_total_krw - ai_mid) / ai_mid * Decimal("100")

    await db.commit()

    # 최신 상태로 재조회 (settlements 새로 로드)
    quote = await repo.get_by_quote_no(quote_no)
    return _to_detail(quote)


# ──────────────────────────────────────────────────────────────────────────────
# 인보이스 PDF 업로드 (파일 저장)
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/quotes/{quote_no}/invoice",
    response_model=InvoiceUploadResponse,
    status_code=201,
    summary="인보이스 PDF 업로드",
)
async def upload_invoice(
    quote_no: str,
    file: UploadFile = File(..., description="인보이스 PDF 파일"),
    db: AsyncSession = Depends(get_db),
):
    """인보이스 PDF를 서버에 저장하고 저장 경로를 반환한다.

    파일은 uploads/invoices/{quote_no}/ 에 저장된다.
    AI 파싱이 필요하면 POST /quotes/{quote_no}/settlements/upload-invoice 를 사용한다.
    """
    repo = QuoteRepository(db)
    quote = await repo.get_by_quote_no(quote_no)
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="견적을 찾을 수 없습니다.")

    allowed_types = {"application/pdf", "image/jpeg", "image/png", "image/tiff"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 파일 형식입니다. (허용: PDF, JPEG, PNG, TIFF)",
        )

    # 저장 디렉터리 확보
    save_dir = os.path.abspath(os.path.join(_UPLOAD_BASE, quote_no))
    os.makedirs(save_dir, exist_ok=True)

    # 원본 확장자 유지 + UUID로 파일명 충돌 방지
    ext = os.path.splitext(file.filename or "invoice.pdf")[1] or ".pdf"
    saved_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = os.path.join(save_dir, saved_name)

    contents = await file.read()
    with open(saved_path, "wb") as f:
        f.write(contents)

    return InvoiceUploadResponse(
        quote_no=quote_no,
        filename=saved_name,
        saved_path=saved_path,
        size_bytes=len(contents),
    )
