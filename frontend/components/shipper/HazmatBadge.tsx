import { AlertTriangle, HelpCircle } from "lucide-react";
import { checkHazmat } from "@/lib/constants/hazmatMock";

export function HazmatBadge({ item }: { item: string }) {
  const result = checkHazmat(item);

  if (result.status === "clear") return null;

  if (result.status === "hazmat") {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">
            위험물 해당 — {result.unNumber} · {result.className}
          </p>
          <p className="mt-0.5 text-xs text-red-500">[출처: {result.source}]</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
      <HelpCircle size={16} className="mt-0.5 shrink-0" />
      <p>{result.reason}</p>
    </div>
  );
}
