"use client";

import { X } from "lucide-react";
import { ContainerSelect } from "@/components/shipper/ContainerSelect";
import { QuantitySelect } from "@/components/shipper/QuantitySelect";
import { ItemCombobox } from "@/components/shipper/ItemCombobox";
import { HazmatBadge } from "@/components/shipper/HazmatBadge";
import type { ContainerSpecValue } from "@/lib/constants/containers";

export type ContainerItemRowValue = {
  id: string;
  containerType: ContainerSpecValue | null;
  quantity: number | null;
  item: string;
};

export function createEmptyContainerItemRow(): ContainerItemRowValue {
  return {
    id: crypto.randomUUID(),
    containerType: null,
    quantity: null,
    item: "",
  };
}

export function ContainerItemRow({
  value,
  onChange,
  onRemove,
  removable,
}: {
  value: ContainerItemRowValue;
  onChange: (value: ContainerItemRowValue) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <div className="grid grid-cols-2 gap-4">
          <ContainerSelect
            value={value.containerType}
            onChange={(containerType) => onChange({ ...value, containerType })}
          />
          <QuantitySelect
            value={value.quantity}
            onChange={(quantity) => onChange({ ...value, quantity })}
          />
        </div>

        <div className="mt-3">
          <ItemCombobox
            value={value.item}
            onChange={(item) => onChange({ ...value, item })}
          />
          {value.item && <HazmatBadge item={value.item} />}
        </div>
      </div>

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
