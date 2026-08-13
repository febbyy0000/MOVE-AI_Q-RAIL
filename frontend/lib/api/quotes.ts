const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const PENDING_QUOTE_STORAGE_KEY = "pendingQuoteRequest";

export type CreateQuotePayload = {
  shipper_id: string;
  destination: string;
  dispatch_date: string;
  exchange_rate?: number;
  containers: {
    container_type: string;
    quantity: number;
    item_name: string;
    hs_code?: string | null;
  }[];
};

export type SectionCategory =
  | "DOMESTIC"
  | "OVERSEAS_2_1"
  | "OVERSEAS_2_2"
  | "OTHER";

export type ContainerResponse = {
  id: number;
  container_type: string;
  quantity: number;
  item_name: string;
  hs_code: string | null;
};

export type AIDetailResponse = {
  id: number;
  section_category: SectionCategory;
  item_name: string;
  basis: string | null;
  note: string | null;
  currency: string;
  amount_min: string;
  amount_max: string;
  krw_amount_min: string;
  krw_amount_max: string;
};

export type QuoteResponse = {
  id: string;
  quote_no: string;
  shipper_id: string;
  departure: string;
  destination: string;
  dispatch_date: string;
  status: string;
  exchange_rate: string;
  ai_total_krw_min: string | null;
  ai_total_krw_max: string | null;
  actual_total_krw: string | null;
  error_rate: string | null;
  created_at: string;
  updated_at: string;
  containers: ContainerResponse[];
  ai_details: AIDetailResponse[];
};

export async function createQuote(
  payload: CreateQuotePayload,
): Promise<QuoteResponse> {
  const res = await fetch(`${API_BASE_URL}/quotes/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "견적 산정 요청에 실패했습니다.");
  }

  return res.json();
}

export async function getQuote(quoteNo: string): Promise<QuoteResponse> {
  const res = await fetch(
    `${API_BASE_URL}/quotes/${encodeURIComponent(quoteNo)}`,
  );

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "견적을 불러오지 못했습니다.");
  }

  return res.json();
}
