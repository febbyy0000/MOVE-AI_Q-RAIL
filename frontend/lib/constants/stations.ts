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
  },
  {
    code: "TAS",
    name: "타슈켄트",
    country: "Uzbekistan(UZ)",
    Flag: FlagUz,
  },
];
