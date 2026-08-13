"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ShipperHeader } from "@/components/shipper/ShipperHeader";
import { RouteSelector } from "@/components/shipper/RouteSelector";
import { DateField } from "@/components/shipper/DateField";
import { ContainerItemsSection } from "@/components/shipper/ContainerItemsSection";
import { SectionNav } from "@/components/shipper/SectionNav";
import type { Station } from "@/types/station";
import { createEmptyContainerItemRow } from "@/components/shipper/ContainerItemRow";
import { type CreateQuotePayload, PENDING_QUOTE_STORAGE_KEY } from "@/lib/api/quotes";

const SECTIONS = [
  { id: "route", label: "출발지 / 도착지" },
  { id: "date", label: "이용 예상 날짜" },
  { id: "containers", label: "컨테이너 규격 · 수량 및 품목" },
];

// TODO: 로그인 기능 붙으면 실제 로그인한 유저 id로 교체
const TEST_SHIPPER_ID = "2a0bbb20-5eff-4368-a44d-37497410ae07";

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function RequestPage() {
  const router = useRouter();
  const [arrival, setArrival] = useState<Station | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [containerRows, setContainerRows] = useState(() => [
    createEmptyContainerItemRow(),
  ]);

  const filledRows = containerRows.filter(
    (row) =>
      row.containerType !== null && row.quantity !== null && row.item !== "",
  );

  const completed = [
    arrival !== null,
    date !== null,
    filledRows.length > 0,
  ];

  const canSubmit = completed.every(Boolean);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleSubmit = () => {
    if (!arrival || !date || filledRows.length === 0) return;

    const payload: CreateQuotePayload = {
      shipper_id: TEST_SHIPPER_ID,
      destination: arrival.name,
      dispatch_date: toISODate(date),
      containers: filledRows.map((row) => ({
        container_type: row.containerType as string,
        quantity: row.quantity as number,
        item_name: row.item,
      })),
    };

    sessionStorage.setItem(PENDING_QUOTE_STORAGE_KEY, JSON.stringify(payload));
    setIsLeaving(true);
    setTimeout(() => router.push("/calculating"), 280);
  };

  return (
    <motion.div
      animate={{ opacity: isLeaving ? 0 : 1, scale: isLeaving ? 0.98 : 1 }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className="min-h-screen w-full bg-white"
    >
      <ShipperHeader />

      <aside className="fixed top-40 left-16 hidden md:block">
        <SectionNav sections={SECTIONS} completed={completed} />
      </aside>

      <div className="mx-auto max-w-5xl px-5 pt-16 pb-10">
        <h1 className="mx-auto max-w-xl text-[24px] font-extrabold">
          견적 요청
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-gray-500">
          노선 및 컨테이너 / 품목 정보(필수)를 입력하세요
        </p>

        <section id="route" className="scroll-mt-24">
          <h2 className="mx-auto mt-16 max-w-xl text-xl font-extrabold">
            출발지 / 도착지
          </h2>
          <div className="mt-4">
            <RouteSelector value={arrival} onChange={setArrival} />
          </div>
        </section>

        <section id="date" className="scroll-mt-24">
          <h2 className="mx-auto mt-16 max-w-xl text-xl font-extrabold">
            이용 예상 날짜
          </h2>
          <div className="mx-auto mt-4 max-w-xl">
            <DateField value={date} onChange={setDate} />
          </div>
        </section>

        <section id="containers" className="scroll-mt-24">
          <h2 className="mx-auto mt-16 max-w-xl text-xl font-extrabold">
            컨테이너 규격 · 수량 및 품목
          </h2>
          <div className="mx-auto mt-4 max-w-xl">
            <ContainerItemsSection
              value={containerRows}
              onChange={setContainerRows}
            />
          </div>
        </section>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="mx-auto mt-16 flex h-14 w-full max-w-xl items-center justify-center rounded-[10px] bg-maincolor text-lg font-extrabold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          견적 산정하기
        </button>
      </div>
    </motion.div>
  );
}
