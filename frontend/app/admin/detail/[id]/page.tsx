"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { MOCK_RECORDS } from "@/lib/constants/adminRecords";

export default function AdminDetailPage() {
  const params = useParams<{ id: string }>();
  const record = MOCK_RECORDS.find((r) => r.id === params.id);

  if (!record) {
    return (
      <div>
        <p className="text-gray-400">해당 견적을 찾을 수 없습니다.</p>
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
          <p className="text-sm font-bold text-maincolor">관리번호 {record.quoteNo}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">{record.company}</h1>
        </div>
        <span
          className={`rounded-lg px-4 py-2 text-sm font-bold ${
            record.status === "미등록"
              ? "bg-red-50 text-red-500"
              : "bg-green-50 text-green-600"
          }`}
        >
          [{record.status}]
        </span>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-5">
        <div className="rounded-2xl border border-gray-200 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
          <p className="text-sm text-gray-400">운송 구간</p>
          <p className="mt-3 text-xl font-extrabold text-gray-700">
            {record.departure} ➔ {record.destination}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
          <p className="text-sm text-gray-400">컨테이너</p>
          <p className="mt-3 text-xl font-extrabold text-gray-700">
            {record.containerSummary}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
          <p className="text-sm text-gray-400">예상 총액</p>
          <p className="mt-3 text-xl font-extrabold text-[#2D6AF7]">
            {record.totalAmount}
          </p>
        </div>
      </div>

      {/* TODO: 백엔드 상세 조회 API 연동 후 실제 견적 세부 내역(구간별 산정 내역 등)으로 대체 */}
      <div className="mt-8 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
        견적 상세 산정 내역은 백엔드 연동 후 표시될 예정입니다.
      </div>
    </div>
  );
}
