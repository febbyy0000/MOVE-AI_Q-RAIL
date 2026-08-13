"use client";

import { useDismissableDropdown } from "@/hooks/useDismissableDropdown";

const QUANTITY_OPTIONS = Array.from({ length: 20 }, (_, index) => index + 1);

export function QuantitySelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const { ref, isOpen, setIsOpen } = useDismissableDropdown<HTMLDivElement>();

  return (
    <div ref={ref} className="relative w-full">
      <input
        type="number"
        min={1}
        inputMode="numeric"
        value={value ?? ""}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "") {
            onChange(null);
            return;
          }
          const next = Number(raw);
          if (!Number.isNaN(next)) onChange(next);
        }}
        placeholder="수량을 입력하거나 선택하세요"
        className="h-14 w-full rounded-lg border border-gray-300 px-4 text-base placeholder:text-gray-400"
      />

      {isOpen && (
        <ul className="absolute top-full left-0 z-20 mt-2 max-h-52 w-full divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {QUANTITY_OPTIONS.map((qty) => {
            const isSelected = qty === value;
            return (
              <li key={qty}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(qty);
                    setIsOpen(false);
                  }}
                  className={`flex h-10 w-full items-center px-4 text-left transition-colors duration-150 ${
                    isSelected
                      ? "bg-maincolor text-white"
                      : "bg-white hover:bg-maincolor/10"
                  }`}
                >
                  {qty}개
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
