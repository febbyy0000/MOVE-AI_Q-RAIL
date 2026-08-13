import type { QuoteStatus } from "@/lib/api/quotes";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// [A-01] 운행 이력 목록 조회 전용. 상세 조회/정산 저장은 v1 API(getQuote/createSettlement)를 계속 사용한다.
// TODO: v1 GET /quotes/ 의 ai_details eager-load 버그가 백엔드에서 고쳐지면 이 목록 조회도
// 다시 listQuotes()(v1)로 통합할 수 있다.
export type AdminQuoteListItem = {
  quote_no: string;
  company: string;
  shipper_name: string;
  destination: string;
  dispatch_date: string;
  status: QuoteStatus;
  created_at: string;
};

export async function listAdminQuotes(): Promise<AdminQuoteListItem[]> {
  const res = await fetch(`${API_BASE_URL}/admin/quotes`);

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "견적 목록을 불러오지 못했습니다.");
  }

  return res.json();
}
