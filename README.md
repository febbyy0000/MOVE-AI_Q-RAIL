# 서비스 접근 URL
https://move-ai-q-rail-git-front-51541759667.asia-northeast3.run.app/

# 2026-MOVE-AI

모노레포 구조입니다. 프로젝트별 상세 내용은 각 폴더의 README를 참고하세요.

- [frontend](./frontend/README.md) — Next.js
- [backend](./backend/README.md) — FastAPI

## 🌿 브랜치 전략

```
main        # 배포 브랜치
└─ dev      # 개발 통합 브랜치
   └─ feature/기능명   # 기능 개발 브랜치
   └─ fix/버그명        # 버그 수정 브랜치
```

- `feature/*`, `fix/*` 브랜치는 `dev`에서 분기해서 작업하고, 완료되면 `dev`로 PR
- `dev`는 배포 시점에 검증 후 `main`으로 병합
- 브랜치명 형식: `{type}/{기능명}` (영문 소문자, 띄어쓰기는 대쉬(-)로 통일)
  - 예) `feature/login`, `feature/admin-records`, `fix/header-overflow`

## 📝 커밋 컨벤션

| type | 설명 | 예시 |
| --- | --- | --- |
| `feat` | 기능 추가 | `feat: 견적 입력 폼 구현` |
| `fix` | 버그 수정 | `fix: 컨테이너 수량 검증 오류 수정` |
| `docs` | 문서 추가/수정 | `docs: README 폴더 구조 정리` |
| `style` | 코드 포맷팅 (로직 변경 없음) | `style: 들여쓰기 정리` |
| `refactor` | 리팩토링 | `refactor: API 호출 함수 분리` |
| `chore` | 설정/빌드 등 기타 변경 | `chore: eslint 설정 추가` |

## 🔀 PR 규칙

- PR 제목: `[type] 작업 내용` 형식으로 작성 (예: `[feat] 견적 입력 폼 구현`)
- PR 대상 브랜치: `dev`
- PR 본문에 관련 이슈 번호 포함 (예: `- #12`)
- 리뷰 승인 후 머지
