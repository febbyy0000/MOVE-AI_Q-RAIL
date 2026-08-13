"use client";

import { Plus } from "lucide-react";
import {
  ContainerItemRow,
  createEmptyContainerItemRow,
  type ContainerItemRowValue,
} from "@/components/shipper/ContainerItemRow";

export function ContainerItemsSection({
  value,
  onChange,
}: {
  value: ContainerItemRowValue[];
  onChange: (rows: ContainerItemRowValue[]) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {value.map((row) => (
        <ContainerItemRow
          key={row.id}
          value={row}
          removable={value.length > 1}
          onChange={(next) =>
            onChange(value.map((r) => (r.id === next.id ? next : r)))
          }
          onRemove={() => onChange(value.filter((r) => r.id !== row.id))}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, createEmptyContainerItemRow()])}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-maincolor text-sm font-semibold text-maincolor transition-colors duration-150 hover:bg-maincolor/10"
      >
        <Plus size={16} />
        규격 / 품목 추가하기
      </button>
    </div>
  );
}
