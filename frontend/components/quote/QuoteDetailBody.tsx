"use client";

import { useRef } from "react";
import { Container, TrainFront, Globe, FileText } from "lucide-react";
import {
  computeQuoteBreakdown,
  formatAmount,
  type QuoteDetailData,
} from "@/lib/quoteBreakdown";
import { destinationLabel } from "@/lib/constants/stations";

const RAIL_ICONS: Record<string, typeof TrainFront> = {
  domestic: TrainFront,
  overseas: Globe,
  other: FileText,
};

export function QuoteDetailBody({ quote }: { quote: QuoteDetailData }) {
  const sectionRefs = useRef<Partial<Record<string, HTMLDivElement>>>({});
  const { railData, containerBreakdown, totalMin, totalMax } =
    computeQuoteBreakdown(quote);

  return (
    <>
      {/* Big stats row */}
      <div className="mt-12 grid grid-cols-3 gap-5">
        <div className="relative rounded-2xl border border-gray-200 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
          <p className="text-sm text-gray-400">예상 총액</p>
          <p className="mt-3 text-4xl font-extrabold text-[#2D6AF7]">
            {totalMin === totalMax ? (
              <span className="whitespace-nowrap">{totalMin.toLocaleString()}원</span>
            ) : (
              <>
                <span className="whitespace-nowrap">{totalMin.toLocaleString()}원 ~</span>
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
        {railData.map((rail) => {
          const RailIcon = RAIL_ICONS[rail.key];
          return (
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
                <RailIcon size={24} strokeWidth={2} />
              </span>
              <span className="text-sm font-bold whitespace-nowrap text-gray-500">
                {rail.label}
              </span>
            </button>
          );
        })}
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
    </>
  );
}
