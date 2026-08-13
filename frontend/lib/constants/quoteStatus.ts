import type { QuoteStatus } from "@/lib/api/quotes";

// 백엔드가 내려주는 QuoteStatus 값을 그대로 신뢰한다 (프론트에서 날짜/정산서 여부로 재계산하지 않음).
// "운행 종료"는 실적 저장(SETTLEMENT_COMPLETED)이 끝난 견적에만 붙는다 — 정산 전(ARRIVED)까지는
// 아직 "운행 중"으로 취급해 관리자가 정산 전/후를 헷갈리지 않게 한다.
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  CALCULATING: "운행 전",
  ESTIMATED: "운행 전",
  MOVING: "운행 중",
  ARRIVED: "운행 중",
  SETTLEMENT_COMPLETED: "운행 종료",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  CALCULATING: "text-gray-400",
  ESTIMATED: "text-gray-400",
  MOVING: "text-[#2D6AF7]",
  ARRIVED: "text-[#2D6AF7]",
  SETTLEMENT_COMPLETED: "text-gray-600",
};

export const QUOTE_STATUS_BADGE_STYLES: Record<QuoteStatus, string> = {
  CALCULATING: "bg-gray-100 text-gray-400",
  ESTIMATED: "bg-gray-100 text-gray-400",
  MOVING: "bg-[#2D6AF7]/10 text-[#2D6AF7]",
  ARRIVED: "bg-[#2D6AF7]/10 text-[#2D6AF7]",
  SETTLEMENT_COMPLETED: "bg-gray-100 text-gray-600",
};
