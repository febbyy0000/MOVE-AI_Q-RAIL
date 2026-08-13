import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.ai import ItemClassifyRequest
from app.services.anchor_service import commit_invoice_to_anchors
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
async def parse_invoice_route(
    file: UploadFile = File(...),
    commit: bool = Form(False),
    dest_map: Optional[str] = Form(
        None,
        description='단가→목적지 수동 매핑 JSON. 예: {"2411":"horgos","5123":"tashkent"}'
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    [A-02] 인보이스 문서(PDF/PNG/JPEG) → 운임 데이터 + 규격계수 추출.

    commit=true 시 파싱된 40ft 단가를 overseas_rate_anchors에 적재하고
    이후 견적 산정에 반영된다. dest_map으로 목적지를 수동 지정할 수 있다.
    """
    data = await file.read()
    try:
        parsed = await parse_invoice_bytes(data, file.content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not commit:
        return {**parsed, "committed": False}

    parsed_dest_map: Optional[dict[str, str]] = None
    if dest_map:
        try:
            parsed_dest_map = json.loads(dest_map)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="dest_map JSON 형식 오류")

    anchor_result = await commit_invoice_to_anchors(db, parsed, parsed_dest_map)

    return {
        **parsed,
        "committed": True,
        "anchor_update": anchor_result,
    }
