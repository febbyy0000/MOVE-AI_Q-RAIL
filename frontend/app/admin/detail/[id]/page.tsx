"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getQuote, type QuoteResponse } from "@/lib/api/quotes";
import { listSettlements, type SettlementResponse } from "@/lib/api/settlements";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_BADGE_STYLES } from "@/lib/constants/quoteStatus";
import { QuoteDetailBody } from "@/components/quote/QuoteDetailBody";
import { SettlementSummary } from "@/components/admin/SettlementSummary";

export default function AdminDetailPage() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [settlements, setSettlements] = useState<SettlementResponse[]>([]);
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

  if (!quote) {
    return (
      <div>
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/records"
        className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft size={16} />
        목록으로
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-maincolor">관리번호 {quote.quote_no}</p>
          {/* TODO: 백엔드에 화주(User) 조회 API가 생기면 shipper_id 대신 회사명/담당자명 표시 */}
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
            화주 ID {quote.shipper_id.slice(0, 8)}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded-lg px-4 py-2 text-sm font-bold ${QUOTE_STATUS_BADGE_STYLES[quote.status]}`}
          >
            [{QUOTE_STATUS_LABELS[quote.status]}]
          </span>
          <Link
            href={`/admin/detail/${quote.quote_no}/settlement`}
            className="rounded-lg bg-maincolor px-5 py-2.5 text-sm font-extrabold text-white transition-transform hover:scale-105"
          >
            정산서 업로드
          </Link>
        </div>
      </div>

      <QuoteDetailBody quote={quote} />

      {settlements.length > 0 && (
        <>
          <h2 className="mt-14 text-2xl font-extrabold text-gray-900">
            실적 정산 내역
          </h2>
          <SettlementSummary settlements={settlements} />
        </>
      )}
    </div>
  );
}
