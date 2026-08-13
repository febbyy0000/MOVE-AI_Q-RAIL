"use client";

import { ARRIVAL_STATIONS, DEPARTURE_STATIONS } from "@/lib/constants/stations";
import type { Station } from "@/types/station";
import { StationField } from "@/components/shipper/StationField";

const departureStation = DEPARTURE_STATIONS[0];

export function RouteSelector({
  value,
  onChange,
}: {
  value: Station | null;
  onChange: (arrival: Station | null) => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-4">
      <StationField
        label="출발지"
        stations={DEPARTURE_STATIONS}
        selected={departureStation}
        onSelect={() => {}}
        interactive={false}
      />
      <StationField
        label="도착지"
        stations={ARRIVAL_STATIONS}
        selected={value}
        onSelect={onChange}
        allowReset
      />
    </div>
  );
}
