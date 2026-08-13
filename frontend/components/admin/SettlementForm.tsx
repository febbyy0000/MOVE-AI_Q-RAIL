"use client";

import { useRef, useState } from "react";
import {
  computeQuoteBreakdown,
  RAIL_GROUP_DEFS,
  type QuoteDetailData,
} from "@/lib/quoteBreakdown";
import {
  createSettlement,
  deleteSettlement,
  listSettlements,
  uploadInvoice,
  type InvoiceParseResult,
} from "@/lib/api/settlements";
import { updateQuoteStatus, type SectionCategory } from "@/lib/api/quotes";

type Row = {
  section_category: SectionCategory;
  item_name: string;
  basis: string | null;
  note: string | null;
  currency: string;
  actualAmount: string;
  exchangeRate: string;
};

function computeKrw(currency: string, actualAmount: string, exchangeRate: string) {
  const amount = Number(actualAmount);
  const rate = Number(exchangeRate);
  if (!Number.isFinite(amount)) return 0;
  if (currency === "KRW") return Math.round(amount);
  if (!Number.isFinite(rate)) return 0;
  return Math.round(amount * rate);
}

export function SettlementForm({
  quoteNo,
  quote,
  onSaved,
  onCancel,
}: {
  quoteNo: string;
  quote: QuoteDetailData;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { domesticItems, overseasItems, otherItems } = computeQuoteBreakdown(quote);
  const [rows, setRows] = useState<Row[]>(() =>
    [...domesticItems, ...overseasItems, ...otherItems].map((item) => {
      const estimate = Math.round(
        (Number(item.amount_min) + Number(item.amount_max)) / 2,
      );
      return {
        section_category: item.section_category,
        item_name: item.item_name,
        basis: item.basis,
        note: item.note,
        currency: item.currency,
        actualAmount: String(estimate),
        exchangeRate: String(quote.exchange_rate),
      };
    }),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<InvoiceParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleUploadInvoice = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setParseResult(null);
    try {
      const result = await uploadInvoice(quoteNo, file);
      setParseResult(result);
      const amount = result.totalUsd ?? result.lineSum;
      if (amount) {
        setRows((prev) => {
          const firstUsdIndex = prev.findIndex(
            (r) => r.currency === "USD" && RAIL_GROUP_DEFS.find(
              (rail) => rail.key === "overseas",
            )?.categories.includes(r.section_category),
          );
          if (firstUsdIndex === -1) return prev;
          return prev.map((r, i) =>
            i === firstUsdIndex ? { ...r, actualAmount: String(amount) } : r,
          );
        });
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "인보이스 분석에 실패했습니다.");
    } finally {
      setIsParsing(false);
    }
  };

  const totalKrw = rows.reduce(
    (sum, row) => sum + computeKrw(row.currency, row.actualAmount, row.exchangeRate),
    0,
  );

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const existing = await listSettlements(quoteNo);
      for (const s of existing) {
        await deleteSettlement(quoteNo, s.id);
      }

      for (const row of rows) {
        if (row.actualAmount.trim() === "") continue;
        const krwAmount = computeKrw(row.currency, row.actualAmount, row.exchangeRate);
        await createSettlement(quoteNo, {
          section_category: row.section_category,
          item_name: row.item_name,
          basis: row.basis,
          note: row.note,
          currency: row.currency,
          actual_amount: Number(row.actualAmount),
          exchange_rate: row.currency === "USD" ? Number(row.exchangeRate) : null,
          krw_actual_amount: krwAmount,
        });
      }
      await updateQuoteStatus(quoteNo, "SETTLEMENT_COMPLETED");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "정산 실적 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-gray-900">정산 실적 입력</h2>
        <span className="text-2xl font-extrabold text-[#2D6AF7]">
          {totalKrw.toLocaleString()}원
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-100 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
        <p className="text-sm font-bold tracking-wide text-gray-600">인보이스 PDF 업로드</p>
        <p className="mt-1 text-sm text-gray-400">
          PDF를 업로드하면 해외 구간 실 원가가 자동으로 채워집니다. 채워진 값은 검토 후 수정할 수 있어요.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadInvoice(file);
            }}
            className="text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-maincolor file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
          />
          {isParsing && (
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-400">
              <span className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-maincolor" />
              진행중...
            </span>
          )}
        </div>

        {parseError && <p className="mt-3 text-sm text-red-500">{parseError}</p>}

        {parseResult && (
          <div className="mt-4 rounded-xl bg-[#2D6AF7]/5 p-4 text-sm text-gray-600">
            <p>
              인보이스 번호 <span className="font-semibold text-gray-900">{parseResult.invoiceNo ?? "—"}</span>
              {" · "}
              날짜 <span className="font-semibold text-gray-900">{parseResult.date ?? "—"}</span>
              {" · "}
              총액 <span className="font-semibold text-gray-900">
                ${(parseResult.totalUsd ?? parseResult.lineSum).toLocaleString()}
              </span>
            </p>
            {parseResult.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-amber-600">
                {parseResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-col gap-10">
        {RAIL_GROUP_DEFS.map((rail) => {
          const sectionRows = rows
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => rail.categories.includes(row.section_category));

          if (sectionRows.length === 0) return null;

          return (
            <div key={rail.key}>
              <h3 className="text-2xl font-extrabold text-gray-700">
                {rail.number}. {rail.label}
              </h3>
              <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-sm text-gray-400">
                        <th className="px-8 py-4 font-extrabold">항목명</th>
                        <th className="px-8 py-4 font-extrabold">통화</th>
                        <th className="px-8 py-4 font-extrabold">실 원가</th>
                        <th className="px-8 py-4 font-extrabold">적용 환율</th>
                        <th className="px-8 py-4 font-extrabold">KRW 환산액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map(({ row, index }) => (
                        <tr key={index} className="border-b border-gray-50 last:border-0">
                          <td className="px-8 py-4 text-gray-900">{row.item_name}</td>
                          <td className="px-8 py-4 text-gray-500">{row.currency}</td>
                          <td className="px-8 py-4">
                            <input
                              type="number"
                              value={row.actualAmount}
                              onChange={(e) => updateRow(index, { actualAmount: e.target.value })}
                              placeholder="0"
                              className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-right focus:border-maincolor focus:outline-none"
                            />
                          </td>
                          <td className="px-8 py-4">
                            {row.currency === "USD" ? (
                              <input
                                type="number"
                                value={row.exchangeRate}
                                onChange={(e) => updateRow(index, { exchangeRate: e.target.value })}
                                className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-right focus:border-maincolor focus:outline-none"
                              />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-8 py-4 font-semibold text-gray-900">
                            {computeKrw(row.currency, row.actualAmount, row.exchangeRate).toLocaleString()}원
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-3 pt-8">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-maincolor px-5 py-2.5 text-sm font-extrabold text-white transition-transform hover:scale-105 disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : "실적 저장"}
        </button>
      </div>
    </div>
  );
}
