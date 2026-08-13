"use client";

import { X } from "lucide-react";
import { useDismissableDropdown } from "@/hooks/useDismissableDropdown";
import type { Station } from "@/types/station";

export function StationField({
  label,
  stations,
  selected,
  onSelect,
  interactive = true,
  allowReset = false,
}: {
  label: string;
  stations: Station[];
  selected: Station | null;
  onSelect: (station: Station | null) => void;
  interactive?: boolean;
  allowReset?: boolean;
}) {
  const { ref, isOpen, setIsOpen } = useDismissableDropdown<HTMLDivElement>();

  return (
    <div ref={ref} className="relative w-full">
      <p className="mb-2 text-sm font-semibold text-gray-500">{label}</p>
      <button
        type="button"
        onClick={() => interactive && setIsOpen((prev) => !prev)}
        className={`flex h-14 w-full items-center justify-between rounded-lg border border-gray-300 px-4 text-left text-base ${
          interactive ? "" : "bg-gray-50 text-gray-500"
        }`}
      >
        <span className="flex items-center gap-2">
          {selected?.Flag && <selected.Flag width={24} height={24} />}
          {selected ? selected.name : `${label} 선택`}
        </span>
        {allowReset && selected && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(null);
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500"
          >
            <X size={14} />
          </span>
        )}
      </button>

      {interactive && isOpen && (
        <div className="absolute top-full left-0 z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <X size={16} />
          </button>

          <ul className="divide-y divide-gray-100 pt-10">
            {stations.map((station) => {
              const isSelected = station.code === selected?.code;
              return (
                <li key={station.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(station);
                      setIsOpen(false);
                    }}
                    className={`flex h-16 w-full items-center gap-3 px-4 text-left transition-colors duration-150 ${
                      isSelected
                        ? "bg-maincolor text-white"
                        : "bg-white hover:bg-maincolor/10"
                    }`}
                  >
                    <station.Flag width={40} height={40} />
                    <span className="flex flex-col">
                      <span className="text-base font-medium">
                        {station.name}
                      </span>
                      <span
                        className={`text-xs ${
                          isSelected ? "text-white" : "text-gray-500"
                        }`}
                      >
                        {station.country}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
