export type HazmatCheckResult =
  | { status: "hazmat"; unNumber: string; className: string; source: string }
  | { status: "needs_review"; reason: string }
  | { status: "clear" };

// Placeholder results mirroring the actual RAG proof-of-concept output
// (Chroma retrieval over the Korail UN dangerous-goods table + Gemini
// judgment). Wire this up to the real API once the backend endpoint exists.
const MOCK_RESULTS: Record<string, HazmatCheckResult> = {
  "자동차 배터리": {
    status: "hazmat",
    unNumber: "UN3171",
    className: "위험물등급 9 (기타 유해성물질)",
    source: "코레일 위험물코드상세",
  },
  "페인트/도료": {
    status: "hazmat",
    unNumber: "UN3470",
    className: "위험물등급 8 (부식성물질)",
    source: "코레일 위험물코드상세",
  },
  비료: {
    status: "needs_review",
    reason: "관련 규정을 찾았지만 신뢰도가 낮아 확인이 필요합니다.",
  },
};

export function checkHazmat(item: string): HazmatCheckResult {
  return MOCK_RESULTS[item] ?? { status: "clear" };
}
