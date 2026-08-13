import type { SettlementResponse } from "@/lib/api/settlements";

export function SettlementSummary({ settlements }: { settlements: SettlementResponse[] }) {
  const totalKrw = settlements.reduce(
    (sum, s) => sum + Number(s.krw_actual_amount),
    0,
  );

  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between bg-[#2D6AF7]/10 px-10 py-4">
        <span className="text-lg font-extrabold text-gray-600">실적 정산 총액</span>
        <span className="text-2xl font-extrabold text-[#2D6AF7]">
          {totalKrw.toLocaleString()}원
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-lg">
          <thead>
            <tr className="border-b border-gray-100 text-left text-base text-gray-400">
              <th className="px-10 py-5 font-extrabold">항목명</th>
              <th className="px-10 py-5 font-extrabold">실 원가</th>
              <th className="px-10 py-5 font-extrabold">적용 환율</th>
              <th className="px-10 py-5 font-extrabold">KRW 환산액</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 last:border-0">
                <td className="px-10 py-5 text-gray-900">{s.item_name}</td>
                <td className="px-10 py-5 text-gray-500">
                  {Number(s.actual_amount).toLocaleString()} {s.currency}
                </td>
                <td className="px-10 py-5 text-gray-500">
                  {s.exchange_rate ? `${Number(s.exchange_rate).toLocaleString()}원` : "—"}
                </td>
                <td className="px-10 py-5 font-semibold text-gray-900">
                  {Number(s.krw_actual_amount).toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
