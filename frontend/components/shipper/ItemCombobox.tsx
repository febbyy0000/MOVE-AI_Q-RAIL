"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useDismissableDropdown } from "@/hooks/useDismissableDropdown";
import { COMMODITIES } from "@/lib/constants/commodities";

const VISIBLE_ROWS = 5;
const ROW_HEIGHT_PX = 40;

export function ItemCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { ref, isOpen, setIsOpen } = useDismissableDropdown<HTMLDivElement>();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return COMMODITIES;
    return COMMODITIES.filter((item) => item.includes(trimmed));
  }, [query]);

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={isOpen ? query : value}
          placeholder="품목을 검색하거나 선택하세요"
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
          }}
          onChange={(event) => setQuery(event.target.value)}
          className="h-14 w-full rounded-lg border border-gray-300 pr-4 pl-10 text-base"
        />
      </div>

      {isOpen && (
        <ul
          style={{ maxHeight: VISIBLE_ROWS * ROW_HEIGHT_PX }}
          className="absolute top-full left-0 z-20 mt-2 w-full divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">
              검색 결과가 없습니다
            </li>
          )}
          {filtered.map((item) => {
            const isSelected = item === value;
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  style={{ height: ROW_HEIGHT_PX }}
                  className={`flex w-full items-center px-4 text-left transition-colors duration-150 ${
                    isSelected
                      ? "bg-maincolor text-white"
                      : "bg-white hover:bg-maincolor/10"
                  }`}
                >
                  {item}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
