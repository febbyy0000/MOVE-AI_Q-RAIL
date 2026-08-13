"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getQuote, type QuoteResponse, type AIDetailResponse } from "@/lib/api/quotes";
import { listSettlements, type SettlementResponse } from "@/lib/api/settlements";
import { QuoteDetailBody } from "@/components/quote/QuoteDetailBody";

// 실적 정산 항목을 AIDetailResponse와 같은 모양으로 바꿔서 최종 정산 확정값을
// 견적 상세와 동일한 화면 구조로 보여준다 (min=max=확정값).
function settlementsToAIDetails(settlements: SettlementResponse[]): AIDetailResponse[] {
  return settlements.map((s, index) => ({
    id: -1000 - index,
    section_category: s.section_category,
    item_name: s.item_name,
    basis: s.basis,
    note: s.note,
    currency: s.currency,
    amount_min: s.actual_amount,
    amount_max: s.actual_amount,
    krw_amount_min: s.krw_actual_amount,
    krw_amount_max: s.krw_actual_amount,
  }));
}

export default function AdminSettlementDetailPage() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [settlements, setSettlements] = useState<SettlementResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getQuote(params.id)
      .then(setQuote)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "견적을 불러오지 못했습니다."),
      );
    listSettlements(params.id)
      .then(setSettlements)
      .catch(() => setSettlements([]));
  }, [params.id]);

  if (error) {
    return (
      <div>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (!quote || settlements === null) {
    return (
      <div>
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  const displayQuote = { ...quote, ai_details: settlementsToAIDetails(settlements) };

  return (
    <div>
      <Link
        href="/admin/settlements"
        className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft size={16} />
        최종 정산 목록으로
      </Link>

      <div className="mt-4">
        <p className="text-sm font-bold text-maincolor">관리번호 {quote.quote_no}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-900">최종 정산 내역</h1>
      </div>

      {settlements.length === 0 ? (
        <p className="mt-8 text-gray-400">저장된 정산 실적이 없습니다.</p>
      ) : (
        <QuoteDetailBody quote={displayQuote} />
      )}
    </div>
  );
}
