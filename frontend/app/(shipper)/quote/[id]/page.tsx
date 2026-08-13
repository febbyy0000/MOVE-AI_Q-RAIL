"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ShipperHeader } from "@/components/shipper/ShipperHeader";
import {
  getQuote,
  type AIDetailResponse,
  type QuoteResponse,
  type SectionCategory,
} from "@/lib/api/quotes";

const SECTION_ORDER: SectionCategory[] = [
  "DOMESTIC",
  "OVERSEAS_2_1",
  "OVERSEAS_2_2",
  "OTHER",
];

const SECTION_LABELS: Record<SectionCategory, string> = {
  DOMESTIC: "1. 국내 구간 운임 (오봉역 ➔ 부산항)",
  OVERSEAS_2_1: "2-1. 해외 구간 운임 (연운항 ➔ 호르고스)",
  OVERSEAS_2_2: "2-2. 해외 구간 운임 (호르고스 ➔ 도착지)",
  OTHER: "3. 기타 부대비용 & 서류",
};

function formatAmount(min: string, max: string, currency: string) {
  const minN = Number(min);
  const maxN = Number(max);
  const fmt = (n: number) =>
    currency === "USD"
      ? `$${n.toLocaleString()}`
      : `${n.toLocaleString()}원`;
  return minN === maxN ? fmt(minN) : `${fmt(minN)} ~ ${fmt(maxN)}`;
}

function groupBySection(details: AIDetailResponse[]) {
  return SECTION_ORDER.map((category) => ({
    category,
    items: details.filter((d) => d.section_category === category),
  })).filter((group) => group.items.length > 0);
}

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionCategory | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getQuote(params.id)
      .then((data) => {
        setQuote(data);
        setOpenSection(data.ai_details[0]?.section_category ?? null);
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

  const groups = groupBySection(quote.ai_details);

  return (
    <div className="min-h-screen w-full bg-white">
      <ShipperHeader />

      <div className="mx-auto max-w-3xl px-5 pt-16 pb-20">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <p className="text-sm font-bold text-maincolor">
              관리번호: {quote.quote_no}
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-gray-900">
              사전 예상 운송비용 요약
              <span className="ml-2 text-sm font-normal text-gray-400">
                (해상 운임 미포함)
              </span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white"
          >
            견적서 저장 / PDF 출력
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-500">
          {quote.departure} ➔ {quote.destination} · 운송 희망일{" "}
          {quote.dispatch_date} · 적용환율 {Number(quote.exchange_rate).toLocaleString()}
          원/USD
        </p>

        <table className="mt-6 w-full overflow-hidden rounded-lg border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-semibold">대구간 구분</th>
              <th className="px-4 py-3 font-semibold">예상 금액</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ category, items }) => {
              const krwMin = items.reduce(
                (sum, d) => sum + Number(d.krw_amount_min),
                0,
              );
              const krwMax = items.reduce(
                (sum, d) => sum + Number(d.krw_amount_max),
                0,
              );

              return (
                <tr key={category} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {SECTION_LABELS[category]}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {formatAmount(String(krwMin), String(krwMax), "KRW")}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-gray-200 bg-[#1e293b] text-white">
              <td className="px-4 py-3 font-bold">예상 총액</td>
              <td className="px-4 py-3 font-bold">
                {formatAmount(
                  quote.ai_total_krw_min ?? "0",
                  quote.ai_total_krw_max ?? "0",
                  "KRW",
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 flex flex-col gap-3">
          {groups.map(({ category, items }) => {
            const isOpen = openSection === category;
            return (
              <div
                key={category}
                className="overflow-hidden rounded-lg border border-gray-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : category)}
                  className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900"
                >
                  <span>{SECTION_LABELS[category]}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400">
                        <th className="px-4 py-2 font-medium">세부 항목명</th>
                        <th className="px-4 py-2 font-medium">산출 기준</th>
                        <th className="px-4 py-2 font-medium">금액</th>
                        <th className="px-4 py-2 font-medium">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="px-4 py-2">{item.item_name}</td>
                          <td className="px-4 py-2 text-gray-500">
                            {item.basis}
                          </td>
                          <td className="px-4 py-2 font-semibold">
                            {formatAmount(
                              item.amount_min,
                              item.amount_max,
                              item.currency,
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-400">
                            {item.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-bold text-gray-900">컨테이너 정보</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
            {quote.containers.map((c) => (
              <li key={c.id}>
                {c.container_type} × {c.quantity}개 — {c.item_name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
