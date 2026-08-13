# Q-RAIL 프로젝트 컨텍스트

## 프로젝트 명칭

- 현재 이름: **Q-RAIL**
- 구 이름: KICE-quote (참고용 코드 `files_1251/`에 남아있는 구 명칭 — 혼동 금지)
- 코드나 주석에서 "KICE-quote", "KICE Quote" 등을 보면 Q-RAIL 프로젝트의 구 명칭이다

## AI / LLM 정책

- **Gemini API만 사용** (`gemini-2.0-flash`)
- API 키: `.env`의 `GEMINI_API_KEY`로 읽음 → `settings.GEMINI_API_KEY`
- Anthropic / Claude SDK 사용 금지 (참고용 디렉터리 `files_1251/`의 구현은 Claude를 쓰지만, 메인 앱은 Gemini 전용)

## 디렉터리 구조 요점

```
backend/
├── app/
│   ├── api/v1/routes/   # 라우터 (auth, quotes, settlements, ai)
│   ├── services/        # 비즈니스 로직
│   │   ├── llm_invoice_parser.py  # 인보이스 파싱 (A-02/03)
│   │   ├── llm_item_classify.py   # 자연어→HS Code (U-01)
│   │   ├── overseas_calc.py       # TCR 해외 운임 예측 (SVR + Gemini)
│   │   └── domestic_calc.py       # 국내 구간 운임 계산
│   ├── schemas/
│   │   └── ai.py                  # AI 관련 스키마
│   └── models/
│       └── shipping_record_base.py  # SVR 학습 데이터 테이블
├── files_1251/          # 참고용 디렉터리 (구 KICE-quote 데모 코드, 수정 금지)
└── scripts/
    └── augment_data.py  # SVR 초기 학습 데이터 120건 생성 & DB 적재
```

## 화면 코드 대응

| 화면 코드 | 기능 | 연결 API |
|-----------|------|----------|
| U-01 | 자연어 견적 요청 입력 | `POST /api/v1/ai/classify-item` |
| A-02 | 인보이스 파싱 (관리자) | `POST /api/v1/ai/parse-invoice` |
| A-03 | 정산 관리 | `POST /api/v1/quotes/{quote_no}/settlements/upload-invoice` |
| S-04~06 | 견적 결과 화면 | `POST /api/v1/quotes/` |
