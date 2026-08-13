import type { QuoteStatus } from "@/lib/api/quotes";

// 백엔드가 내려주는 QuoteStatus 값을 그대로 신뢰한다 (프론트에서 날짜/정산서 여부로 재계산하지 않음).
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  CALCULATING: "산정 중",
  ESTIMATED: "운행 전",
  MOVING: "운행 중",
  ARRIVED: "운행 완료",
  SETTLEMENT_COMPLETED: "정산 완료",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  CALCULATING: "text-gray-300",
  ESTIMATED: "text-gray-400",
  MOVING: "text-[#2D6AF7]",
  ARRIVED: "text-gray-600",
  SETTLEMENT_COMPLETED: "text-gray-700",
};

export const QUOTE_STATUS_BADGE_STYLES: Record<QuoteStatus, string> = {
  CALCULATING: "bg-gray-100 text-gray-300",
  ESTIMATED: "bg-gray-100 text-gray-400",
  MOVING: "bg-[#2D6AF7]/10 text-[#2D6AF7]",
  ARRIVED: "bg-gray-100 text-gray-600",
  SETTLEMENT_COMPLETED: "bg-gray-100 text-gray-700",
};
