"use client";

import { Container } from "lucide-react";
import { useDismissableDropdown } from "@/hooks/useDismissableDropdown";
import { CONTAINER_SPECS, type ContainerSpecValue } from "@/lib/constants/containers";

export function ContainerSelect({
  value,
  onChange,
}: {
  value: ContainerSpecValue | null;
  onChange: (value: ContainerSpecValue) => void;
}) {
  const { ref, isOpen, setIsOpen } = useDismissableDropdown<HTMLDivElement>();
  const selected = CONTAINER_SPECS.find((spec) => spec.value === value) ?? null;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-14 w-full items-center gap-2 rounded-lg border border-gray-300 px-4 text-left text-base"
      >
        <Container size={20} className="shrink-0 text-gray-400" />
        <span>
          {selected ? `${selected.label} (${selected.sublabel})` : "규격 선택"}
        </span>
      </button>

      {isOpen && (
        <ul className="absolute top-full left-0 z-20 mt-2 w-full divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-lg">
          {CONTAINER_SPECS.map((spec) => {
            const isSelected = spec.value === value;
            return (
              <li key={spec.value}>
                <button
                  type="button"
                  disabled={spec.disabled}
                  onClick={() => {
                    if (spec.disabled) return;
                    onChange(spec.value);
                    setIsOpen(false);
                  }}
                  className={`flex h-14 w-full items-center gap-3 px-4 text-left transition-colors duration-150 ${
                    spec.disabled
                      ? "cursor-not-allowed text-gray-300"
                      : isSelected
                        ? "bg-maincolor text-white"
                        : "bg-white hover:bg-maincolor/10"
                  }`}
                >
                  <Container
                    size={20}
                    className={
                      spec.disabled
                        ? "text-gray-300"
                        : isSelected
                          ? "text-white"
                          : "text-gray-400"
                    }
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{spec.label}</span>
                    <span
                      className={`text-xs ${
                        spec.disabled
                          ? "text-gray-300"
                          : isSelected
                            ? "text-white"
                            : "text-gray-500"
                      }`}
                    >
                      {spec.sublabel}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
