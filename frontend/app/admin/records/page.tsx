import Link from "next/link";
import { MOCK_RECORDS } from "@/lib/constants/adminRecords";

export default function AdminRecordsPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900">대시보드</h1>
      <p className="mt-2 text-gray-500">화주가 요청한 견적 등록 현황을 확인하세요</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
              <th className="px-6 py-4 font-semibold">관리번호</th>
              <th className="px-6 py-4 font-semibold">포워딩사</th>
              <th className="px-6 py-4 font-semibold">날짜</th>
              <th className="px-6 py-4 font-semibold">상태</th>
              <th className="px-6 py-4 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RECORDS.map((record) => (
              <tr
                key={record.id}
                className={`border-b border-gray-50 last:border-0 ${
                  record.status === "미등록" ? "bg-red-50/40" : ""
                }`}
              >
                <td className="px-6 py-4 font-semibold text-gray-900">
                  {record.quoteNo}
                </td>
                <td className="px-6 py-4 text-gray-700">{record.company}</td>
                <td className="px-6 py-4 text-gray-500">{record.date.slice(5)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`font-bold ${
                      record.status === "미등록" ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    [{record.status}]
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/detail/${record.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-maincolor px-4 py-2 text-xs font-bold text-white transition-transform hover:scale-105"
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
