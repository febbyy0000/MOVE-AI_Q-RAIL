import { FlagKr, FlagKz, FlagUz } from "@sankyu/react-circle-flags";
import type { Station } from "@/types/station";

export const DEPARTURE_STATIONS: Station[] = [
  {
    code: "OBS",
    name: "오봉역",
    country: "Korea, Republic of(KR)",
    Flag: FlagKr,
  },
];

export const ARRIVAL_STATIONS: Station[] = [
  {
    code: "ALA",
    name: "알마티",
    country: "Kazakhstan(KZ)",
    Flag: FlagKz,
    apiKey: "almaty",
  },
  {
    code: "TAS",
    name: "타슈켄트",
    country: "Uzbekistan(UZ)",
    Flag: FlagUz,
    apiKey: "tashkent",
  },
];

// 백엔드가 반환하는 영문 목적지 키 → 화면 표시용 한글 라벨
export const DESTINATION_LABELS: Record<string, string> = {
  almaty: "알마티",
  tashkent: "타슈켄트",
  horgas: "호르고스",
};

export function destinationLabel(destination: string): string {
  return DESTINATION_LABELS[destination] ?? destination;
}
