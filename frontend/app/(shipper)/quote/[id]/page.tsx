"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Container, TrainFront, Globe, FileText } from "lucide-react";
import { ShipperHeader } from "@/components/shipper/ShipperHeader";
import { PrintableQuoteDocument } from "@/components/shipper/PrintableQuoteDocument";
import { downloadQuoteExcel } from "@/lib/export/quoteExcel";
import {
  getQuote,
  type AIDetailResponse,
  type QuoteResponse,
  type SectionCategory,
} from "@/lib/api/quotes";
import { destinationLabel } from "@/lib/constants/stations";

const SECTION_ORDER: SectionCategory[] = [
  "DOMESTIC",
  "OVERSEAS_HORGAS",
  "OVERSEAS_DEST",
  "OTHER",
];

const RAIL_GROUPS = [
  { key: "domestic", number: "1", label: "국내 구간", categories: ["DOMESTIC"] as SectionCategory[], icon: TrainFront },
  { key: "overseas", number: "2", label: "해외 구간", categories: ["OVERSEAS_HORGAS", "OVERSEAS_DEST"] as SectionCategory[], icon: Globe },
  { key: "other", number: "3", label: "기타 부대비용", categories: ["OTHER"] as SectionCategory[], icon: FileText },
];

function formatAmount(min: string, max: string, currency: string) {
  const minN = Number(min);
  const maxN = Number(max);
  const fmt = (n: number) =>
    currency === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()}원`;
  return minN === maxN ? fmt(minN) : `${fmt(minN)} ~ ${fmt(maxN)}`;
}

// TODO: 백엔드에 해외 구간/기타 부대비용 산정 로직이 아직 없어서, 화면 구성 확인용으로
// 화면기획서(U-03) 목업 수치를 임시로 채워둠. 실제 API가 해당 구간 데이터를 내려주기
// 시작하면 이 함수는 자동으로 무시된다 (아래 병합 로직에서 실제 데이터 우선).
function getMockDetails(destinationKr: string): AIDetailResponse[] {
  return [
    {
      id: -1,
      section_category: "OVERSEAS_HORGAS",
      item_name: "대륙철도(TCR) 운임",
      basis: "연운항 ➔ 호르고스 구간 기준",
      note: "변동 가능",
      currency: "USD",
      amount_min: "2571",
      amount_max: "3465",
      krw_amount_min: "3620000",
      krw_amount_max: "4880000",
    },
    {
      id: -2,
      section_category: "OVERSEAS_HORGAS",
      item_name: "연운항 터미널 하역·보관료",
      basis: "중국 항만 공시 요율",
      note: "변동 가능",
      currency: "USD",
      amount_min: "140",
      amount_max: "175",
      krw_amount_min: "198000",
      krw_amount_max: "246000",
    },
    {
      id: -3,
      section_category: "OVERSEAS_DEST",
      item_name: "호르고스 국경 환적비",
      basis: "국경 환적 표준 요율",
      note: "기준 요율",
      currency: "USD",
      amount_min: "150",
      amount_max: "150",
      krw_amount_min: "211200",
      krw_amount_max: "211200",
    },
    {
      id: -4,
      section_category: "OVERSEAS_DEST",
      item_name: `호르고스 ➔ ${destinationKr} (도착지 철도 운임)`,
      basis: `호르고스 ➔ ${destinationKr} 구간`,
      note: "공시 요율",
      currency: "USD",
      amount_min: "3929",
      amount_max: "4423",
      krw_amount_min: "5530000",
      krw_amount_max: "6220000",
    },
    {
      id: -5,
      section_category: "OTHER",
      item_name: "FIATA B/L 서류발행비",
      basis: "1건당 고정 요금",
      note: "서류 발급비",
      currency: "KRW",
      amount_min: "44000",
      amount_max: "44000",
      krw_amount_min: "44000",
      krw_amount_max: "44000",
    },
  ];
}

function groupBySection(details: AIDetailResponse[]) {
  return SECTION_ORDER.map((category) => {
    const items = details.filter((d) => d.section_category === category);
    const krwMin = items.reduce((sum, d) => sum + Number(d.krw_amount_min), 0);
    const krwMax = items.reduce((sum, d) => sum + Number(d.krw_amount_max), 0);
    return { category, items, krwMin, krwMax };
  }).filter((group) => group.items.length > 0);
}

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const sectionRefs = useRef<Partial<Record<string, HTMLDivElement>>>({});

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

  const existingCategories = new Set(
    quote.ai_details.map((d) => d.section_category),
  );
  const mergedDetails = [
    ...quote.ai_details,
    ...getMockDetails(destinationLabel(quote.destination)).filter(
      (d) => !existingCategories.has(d.section_category),
    ),
  ];
  const groups = groupBySection(mergedDetails);
  const totalMin = groups.reduce((sum, g) => sum + g.krwMin, 0);
  const totalMax = groups.reduce((sum, g) => sum + g.krwMax, 0);

  const railData = RAIL_GROUPS.map((rail) => {
    const matching = groups.filter((g) => rail.categories.includes(g.category));
    const items = matching.flatMap((g) => g.items);
    const krwMin = matching.reduce((sum, g) => sum + g.krwMin, 0);
    const krwMax = matching.reduce((sum, g) => sum + g.krwMax, 0);
    return { ...rail, items, krwMin, krwMax };
  }).filter((rail) => rail.items.length > 0);

  const domesticItems = railData.find((r) => r.key === "domestic")?.items ?? [];
  const overseasItems = railData.find((r) => r.key === "overseas")?.items ?? [];
  const otherItems = railData.find((r) => r.key === "other")?.items ?? [];

  const containerBreakdown = quote.containers.reduce<
    Record<string, { quantity: number; items: string[] }>
  >((acc, c) => {
    const entry = acc[c.container_type] ?? { quantity: 0, items: [] };
    entry.quantity += c.quantity;
    entry.items.push(c.item_name);
    acc[c.container_type] = entry;
    return acc;
  }, {});

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

        {/* Big stats row */}
        <div className="mt-12 grid grid-cols-3 gap-5">
          <div className="relative rounded-2xl border border-gray-200 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <p className="text-sm text-gray-400">예상 총액</p>
            <p className="mt-3 text-4xl font-extrabold text-[#2D6AF7]">
              {totalMin === totalMax ? (
                <span className="whitespace-nowrap">{totalMin.toLocaleString()}원</span>
              ) : (
                <>
                  <span className="whitespace-nowrap">{totalMin.toLocaleString()}원,</span>
                  <br />
                  <span className="whitespace-nowrap">{totalMax.toLocaleString()}원</span>
                </>
              )}
            </p>
            <span className="absolute top-8 right-5 flex size-10 items-center justify-center rounded-full border border-gray-100 bg-white text-base font-bold text-maincolor shadow-sm">
              ₩
            </span>
          </div>
          <div className="rounded-2xl border border-gray-200 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <p className="text-sm text-gray-400">운송 구간</p>
            <p className="mt-6 text-center text-2xl font-extrabold text-gray-700">
              {quote.departure} ➔ {destinationLabel(quote.destination)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <p className="text-sm text-gray-400">적용 환율</p>
            <p className="mt-6 text-center text-2xl font-extrabold text-gray-700">
              {Number(quote.exchange_rate).toLocaleString()}원/USD
            </p>
          </div>
        </div>

        {/* Item cards */}
        <h2 className="mt-20 text-2xl font-extrabold text-gray-900">
          컨테이너 정보
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-100 p-8 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <p className="text-sm font-bold tracking-wide text-gray-600">
              운송 일정
            </p>
            <dl className="mt-5 flex flex-col gap-4 text-base">
              <div className="flex justify-between">
                <dt className="text-gray-500">출발지</dt>
                <dd className="font-semibold text-gray-900">{quote.departure}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">도착지</dt>
                <dd className="font-semibold text-gray-900">{destinationLabel(quote.destination)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">운송 희망일</dt>
                <dd className="font-semibold text-gray-900">{quote.dispatch_date}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-100 p-8 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <p className="text-sm font-bold tracking-wide text-gray-600">
              컨테이너 규격
            </p>
            <ul className="mt-5 flex flex-col gap-4 text-base">
              {Object.entries(containerBreakdown).map(([type, info]) => (
                <li key={type} className="flex items-center gap-3">
                  <Container size={20} strokeWidth={2} className="shrink-0 text-maincolor" />
                  <span className="flex-1 text-gray-700">{type}</span>
                  <span className="font-semibold text-gray-900">
                    {info.quantity}개
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Route track */}
        <h2 className="mt-14 text-2xl font-extrabold text-gray-900">
          구간별 산정 내역
        </h2>
        <div className="relative mt-10 flex items-start justify-between">
          <div className="absolute top-7 right-7 left-7 h-1 bg-gray-500" />
          {railData.map((rail) => (
            <button
              key={rail.key}
              type="button"
              onClick={() =>
                sectionRefs.current[rail.key]?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="group relative z-10 flex flex-col items-center gap-2"
            >
              <span className="flex size-14 items-center justify-center rounded-full border-4 border-gray-500 bg-white text-gray-500 shadow-[0_4px_10px_rgba(0,0,0,0.05)] transition-colors duration-150 group-hover:border-maincolor group-hover:bg-maincolor group-hover:text-white">
                <rail.icon size={24} strokeWidth={2} />
              </span>
              <span className="text-sm font-bold whitespace-nowrap text-gray-500">
                {rail.label}
              </span>
            </button>
          ))}
        </div>

        {/* Detail sections */}
        <div className="mt-10 flex flex-col gap-10">
          {railData.map((rail) => (
            <div
              key={rail.key}
              ref={(el) => {
                if (el) sectionRefs.current[rail.key] = el;
              }}
              className="scroll-mt-24"
            >
              <h3 className="text-2xl font-extrabold text-gray-700">
                {rail.number}. {rail.label}
              </h3>
              <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between bg-[#2D6AF7]/10 px-10 py-4">
                  <span className="text-lg font-extrabold text-gray-600">예상 금액</span>
                  <span className="text-2xl font-extrabold text-[#2D6AF7]">
                    {formatAmount(String(rail.krwMin), String(rail.krwMax), "KRW")}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-lg">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-base text-gray-400">
                        <th className="px-10 py-5 font-extrabold">세부 항목명</th>
                        <th className="px-10 py-5 font-extrabold">산출 기준</th>
                        <th className="px-10 py-5 font-extrabold">금액</th>
                        <th className="px-10 py-5 font-extrabold">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rail.items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-10 py-5 text-gray-900">{item.item_name}</td>
                          <td className="px-10 py-5 text-gray-500">{item.basis}</td>
                          <td className="px-10 py-5 font-semibold text-gray-900">
                            {formatAmount(item.amount_min, item.amount_max, item.currency)}
                          </td>
                          <td className="px-10 py-5 text-gray-400">{item.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
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
