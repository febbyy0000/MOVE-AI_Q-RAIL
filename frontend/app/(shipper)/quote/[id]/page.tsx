"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShipperHeader } from "@/components/shipper/ShipperHeader";
import { PrintableQuoteDocument } from "@/components/shipper/PrintableQuoteDocument";
import { QuoteDetailBody } from "@/components/quote/QuoteDetailBody";
import { downloadQuoteExcel } from "@/lib/export/quoteExcel";
import { getQuote, type QuoteResponse } from "@/lib/api/quotes";
import { computeQuoteBreakdown } from "@/lib/quoteBreakdown";

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    getQuote(params.id)
      .then((data) => {
        setQuote(data);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "견적을 불러오지 못했습니다.",
        ),
      );
  }, [params.id]);

  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  const { domesticItems, overseasItems, otherItems } =
    computeQuoteBreakdown(quote);

  const handleExcelDownload = async () => {
    setIsExporting(true);
    try {
      await downloadQuoteExcel({ quote, domesticItems, overseasItems, otherItems });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="print:hidden">
        <ShipperHeader />
      </div>

      <div className="mx-auto max-w-7xl px-10 pt-14 pb-24 print:hidden">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base text-gray-500">
              <span className="font-bold text-maincolor">관리번호 {quote.quote_no}</span>
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-gray-900">
              사전 예상 운송비용 요약
              <span className="ml-2 text-sm font-normal text-gray-400">
                {new Date(quote.created_at).toLocaleDateString()}{" "}
                {new Date(quote.created_at).toLocaleTimeString()}
              </span>
            </h1>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white"
            >
              견적서 저장 / PDF 출력
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              disabled={isExporting}
              className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 disabled:opacity-50"
            >
              {isExporting ? "생성 중..." : "Excel 다운로드"}
            </button>
          </div>
        </div>

        <QuoteDetailBody quote={quote} />
      </div>

      <div className="hidden print:block">
        <PrintableQuoteDocument
          quote={quote}
          domesticItems={domesticItems}
          overseasItems={overseasItems}
          otherItems={otherItems}
        />
      </div>
    </div>
  );
}
