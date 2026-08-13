"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getQuote, type QuoteResponse } from "@/lib/api/quotes";
import { SettlementForm } from "@/components/admin/SettlementForm";

export default function AdminSettlementPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getQuote(params.id)
      .then(setQuote)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "견적을 불러오지 못했습니다."),
      );
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
        href={`/admin/detail/${quote.quote_no}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft size={16} />
        상세로 돌아가기
      </Link>

      <div className="mt-4">
        <p className="text-sm font-bold text-maincolor">관리번호 {quote.quote_no}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-900">정산서 업로드</h1>
      </div>

      <SettlementForm
        quoteNo={quote.quote_no}
        quote={quote}
        onCancel={() => router.push(`/admin/detail/${quote.quote_no}`)}
        onSaved={() => router.push(`/admin/detail/${quote.quote_no}`)}
      />
    </div>
  );
}
