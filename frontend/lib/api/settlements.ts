import type { SectionCategory } from "@/lib/api/quotes";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type SettlementCreatePayload = {
  section_category: SectionCategory;
  item_name: string;
  basis?: string | null;
  note?: string | null;
  currency: string;
  actual_amount: number;
  exchange_rate?: number | null;
  krw_actual_amount: number;
};

export type SettlementResponse = {
  id: number;
  quote_id: string;
  section_category: SectionCategory;
  item_name: string;
  basis: string | null;
  note: string | null;
  currency: string;
  actual_amount: string;
  exchange_rate: string | null;
  krw_actual_amount: string;
  created_at: string;
};

export async function listSettlements(
  quoteNo: string,
): Promise<SettlementResponse[]> {
  const res = await fetch(
    `${API_BASE_URL}/quotes/${encodeURIComponent(quoteNo)}/settlements/`,
  );

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "정산 내역을 불러오지 못했습니다.");
  }

  return res.json();
}

export type InvoiceParseResult = {
  invoiceNo: string | null;
  date: string | null;
  containers: { size: "40ft" | "20ft"; count: number }[];
  lines: { unitPriceUsd: number; count: number }[];
  totalUsd: number | null;
  lineSum: number;
  warnings: string[];
  blankFields: string[];
};

export async function uploadInvoice(
  quoteNo: string,
  file: File,
): Promise<InvoiceParseResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${API_BASE_URL}/quotes/${encodeURIComponent(quoteNo)}/settlements/upload-invoice`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "인보이스 분석에 실패했습니다.");
  }

  return res.json();
}

export async function createSettlement(
  quoteNo: string,
  payload: SettlementCreatePayload,
): Promise<SettlementResponse> {
  const res = await fetch(
    `${API_BASE_URL}/quotes/${encodeURIComponent(quoteNo)}/settlements/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "정산 항목 저장에 실패했습니다.");
  }

  return res.json();
}
