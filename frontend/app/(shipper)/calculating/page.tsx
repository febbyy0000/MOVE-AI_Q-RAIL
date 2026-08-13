"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Package, TrainFront, Globe, ArrowLeftRight, FileText, Check } from "lucide-react";
import { ShipperHeader } from "@/components/shipper/ShipperHeader";
import {
  createQuote,
  PENDING_QUOTE_STORAGE_KEY,
  type CreateQuotePayload,
} from "@/lib/api/quotes";
import { destinationLabel } from "@/lib/constants/stations";

const STEP_INTERVAL_MS = 2000;
const REDIRECT_DELAY_MS = 2000;

function LoadingDots() {
  return (
    <span className="inline-flex items-end gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block size-1.5 rounded-full bg-gray-400"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </span>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 210;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="calcProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BFDBFE" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EFF6FF"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#calcProgressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 45, damping: 14, mass: 1 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-5xl font-extrabold text-maincolor">{percent}%</span>
      </div>
    </div>
  );
}

const STEP_ICONS = [Package, TrainFront, Globe, ArrowLeftRight, FileText];

function getStepLabels(destination: string) {
  return [
    "품목 분석 및 위험물/요건 자동 판정",
    "국내 구간 운임 산정 (오봉역 ➔ 부산항)",
    `해외 구간 운임 산정 (연운항 ➔ 호르고스 ➔ ${destination})`,
    "기타 운임 및 환율/할증 산정",
    "최종 운임 산정 및 보고서 생성",
  ];
}

export default function CalculatingPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<CreateQuotePayload | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_QUOTE_STORAGE_KEY);
    if (!raw) {
      router.replace("/request");
      return;
    }
    setPayload(JSON.parse(raw));
  }, [router]);

  useEffect(() => {
    if (!payload) return;

    let cancelled = false;

    const timers = [1, 2, 3, 4, 5].map((step) =>
      setTimeout(() => {
        if (!cancelled) setRevealedCount(step);
      }, step * STEP_INTERVAL_MS),
    );

    createQuote(payload)
      .then((quote) => {
        if (cancelled) return;
        sessionStorage.removeItem(PENDING_QUOTE_STORAGE_KEY);
        setApiDone(true);
        sessionStorage.setItem("lastQuoteNo", quote.quote_no);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "견적 산정에 실패했습니다.",
        );
      });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [payload]);

  const isStepDone = (stepNumber: number) =>
    stepNumber < 5 ? revealedCount > stepNumber : revealedCount >= 5 && apiDone;

  const allDone = revealedCount >= 5 && apiDone;
  const doneCount = [1, 2, 3, 4, 5].filter(isStepDone).length;
  const percent = Math.round((doneCount / 5) * 100);

  useEffect(() => {
    if (!allDone) return;
    const quoteNo = sessionStorage.getItem("lastQuoteNo");
    if (!quoteNo) return;

    const timer = setTimeout(() => {
      sessionStorage.removeItem("lastQuoteNo");
      router.replace(`/quote/${quoteNo}`);
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [allDone, router]);

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white px-5 text-center">
        <p className="text-lg font-bold text-gray-900">
          견적 산정에 실패했습니다
        </p>
        <p className="max-w-sm text-sm text-gray-500">{error}</p>
        <button
          type="button"
          onClick={() => router.replace("/request")}
          className="mt-2 rounded-full bg-maincolor px-6 py-3 text-sm font-bold text-white"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  const labels = getStepLabels(
    payload ? destinationLabel(payload.destination) : "도착지",
  );
  const visibleLabels = labels.slice(0, revealedCount);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="min-h-screen w-full bg-white"
    >
      <ShipperHeader />

      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 pt-24 text-center">
        <h1 className="text-[32px] font-extrabold text-gray-900">
          견적을 산정하고 있습니다
        </h1>
        <p className="mt-2 flex items-center justify-center gap-1 text-lg text-gray-500">
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            공개 API 및 실적 데이터 기반 5단계 산정 진행 중
          </motion.span>
          <LoadingDots />
        </p>

        <div className="mt-8">
          <ProgressRing percent={percent} />
        </div>

        <ul className="mt-10 flex w-full flex-col gap-4">
          {visibleLabels.map((label, index) => {
            const stepNumber = index + 1;
            const isDone = isStepDone(stepNumber);
            const isActive = !isDone && stepNumber === revealedCount;
            const StepIcon = STEP_ICONS[index];

            return (
              <motion.li
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-4 py-3 text-left"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-maincolor text-white">
                  <StepIcon size={22} strokeWidth={6} />
                </span>
                <span className="flex-1 text-[20px] font-extrabold text-gray-700">
                  {label}
                </span>
                {isDone ? (
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "backOut" }}
                    className="shrink-0 text-gray-300"
                  >
                    <Check size={28} strokeWidth={4} />
                  </motion.span>
                ) : (
                  isActive && (
                    <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-maincolor" />
                  )
                )}
              </motion.li>
            );
          })}
        </ul>

        {allDone && (
          <motion.p
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "backOut" }}
            className="mt-8 text-base font-extrabold text-gray-900"
          >
            산정이 완료되었습니다! 결과 화면으로 이동합니다...
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
