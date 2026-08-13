"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAdminQuotes, type AdminQuoteListItem } from "@/lib/api/admin";
import { destinationLabel } from "@/lib/constants/stations";

export default function AdminSettlementsPage() {
  const [quotes, setQuotes] = useState<AdminQuoteListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminQuotes("SETTLEMENT_COMPLETED")
      .then(setQuotes)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "정산 목록을 불러오지 못했습니다."),
      );
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-700">최종 정산 목록</h1>
      <p className="mt-2 text-gray-500">정산이 완료되어 실 원가가 확정된 견적을 확인하세요</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-[#2D6AF7]/10 text-left text-gray-500">
              <th className="px-6 py-4 font-semibold">관리번호</th>
              <th className="px-6 py-4 font-semibold">포워딩사</th>
              <th className="px-6 py-4 font-semibold">도착지</th>
              <th className="px-6 py-4 font-semibold">희망 날짜</th>
              <th className="px-6 py-4 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  {error}
                </td>
              </tr>
            )}
            {!error && quotes === null && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            )}
            {!error && quotes?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  정산 완료된 견적이 없습니다.
                </td>
              </tr>
            )}
            {quotes?.map((quote) => (
              <tr
                key={quote.quote_no}
                className="border-b border-gray-50 last:border-0"
              >
                <td className="px-6 py-4 font-semibold text-gray-900">
                  {quote.quote_no}
                </td>
                <td className="px-6 py-4 text-gray-700">{quote.company}</td>
                <td className="px-6 py-4 text-gray-700">
                  {destinationLabel(quote.destination)}
                </td>
                <td className="px-6 py-4 text-gray-500">{quote.dispatch_date}</td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/settlements/${quote.quote_no}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-maincolor px-5 py-2.5 text-sm font-extrabold text-white transition-transform hover:scale-105"
                  >
                    상세보기 →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
