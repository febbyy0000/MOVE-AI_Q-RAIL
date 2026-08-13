"""
품목 자연어 분류 서비스 (U-01)

화주의 자연어 견적 요청에서 목적지/규격/수량/날짜를 추출하고 HS Code를 추정한다.
Gemini 2.0 Flash 사용.
"""

import json
import logging
from datetime import date
from typing import Optional

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

_REQUEST_SYSTEM = """당신은 국제복합운송 견적 요청 해석기입니다.
화주의 자연어 요청에서 견적에 필요한 정보를 추출합니다.

출력은 JSON만. 코드펜스와 설명 금지.

{
  "destination": "horgos"|"almaty"|"tashkent"|null,
  "size": "20ft"|"40ft"|null,
  "qty": number|null,
  "date": "YYYY-MM-DD"|null,
  "item": string|null,
  "hsGuess": {"code":"8708.30","label":"제동장치 부분품","confidence":0.0~1.0}|null
}

규칙:
- 도착지는 호르고스/알마티/타슈켄트 3곳만 지원합니다. 그 외는 null.
- 상대 날짜("다음달", "9월 중순")는 오늘 기준으로 환산하세요. 오늘은 {TODAY}입니다.
- 규격 미언급 시 null. 40ft로 임의 가정하지 마세요.
- hsGuess는 6자리까지만. 확신이 낮으면 confidence를 낮게, 모르면 null.
- 추측으로 빈칸을 메우지 마세요. 없으면 null이 정답입니다."""


async def classify_item(text: str, today: Optional[str] = None) -> dict:
    """
    자연어 견적 요청 → 구조화된 필드 + HS Code 추정.

    Args:
        text:  화주 자연어 입력 ("다음달에 알마티로 자동차부품 40피트 3개")
        today: 기준일 YYYY-MM-DD (None이면 서버 오늘 날짜)

    Returns:
        destination, size, qty, date, item, hsGuess, missing(list), ready(bool)
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")

    today_str = today or date.today().isoformat()
    system = _REQUEST_SYSTEM.replace("{TODAY}", today_str)

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    response = await client.aio.models.generate_content(
        model="gemini-flash-latest",
        contents=text,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.0,
            response_mime_type="application/json",
        ),
    )

    try:
        parsed = json.loads(response.text or "{}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini 응답 JSON 파싱 실패: {response.text[:300]}") from e

    missing = [f for f in ("destination", "size", "qty", "date") if not parsed.get(f)]
    return {**parsed, "missing": missing, "ready": not missing}
