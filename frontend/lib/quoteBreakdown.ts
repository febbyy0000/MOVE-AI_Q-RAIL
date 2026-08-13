import type {
  AIDetailResponse,
  ContainerResponse,
  SectionCategory,
} from "@/lib/api/quotes";
import { destinationLabel } from "@/lib/constants/stations";

export type QuoteDetailData = {
  departure: string;
  destination: string;
  dispatch_date: string;
  exchange_rate: string;
  containers: ContainerResponse[];
  ai_details: AIDetailResponse[];
};

const SECTION_ORDER: SectionCategory[] = [
  "DOMESTIC",
  "OVERSEAS_HORGAS",
  "OVERSEAS_DEST",
  "OTHER",
];

export const RAIL_GROUP_DEFS = [
  { key: "domestic", number: "1", label: "국내 구간", categories: ["DOMESTIC"] as SectionCategory[] },
  { key: "overseas", number: "2", label: "해외 구간", categories: ["OVERSEAS_HORGAS", "OVERSEAS_DEST"] as SectionCategory[] },
  { key: "other", number: "3", label: "기타 부대비용", categories: ["OTHER"] as SectionCategory[] },
];

export function formatAmount(min: string, max: string, currency: string) {
  const minN = Number(min);
  const maxN = Number(max);
  const fmt = (n: number) =>
    currency === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()}원`;
  return minN === maxN ? fmt(minN) : `${fmt(minN)} ~ ${fmt(maxN)}`;
}

// TODO: 백엔드에 해외 구간/기타 부대비용 산정 로직이 아직 없어서, 화면 구성 확인용으로
// 화면기획서(U-03) 목업 수치를 임시로 채워둠. 실제 API가 해당 구간 데이터를 내려주기
// 시작하면 이 함수는 자동으로 무시된다 (아래 병합 로직에서 실제 데이터 우선).
// 국내 구간(DOMESTIC) 항목은 실제 견적에는 항상 백엔드가 내려주므로 자동 override되고,
// 관리자 목업 데이터처럼 실제 API를 거치지 않는 화면에서만 표시된다.
function getMockDetails(destinationKr: string): AIDetailResponse[] {
  return [
    {
      id: -6,
      section_category: "DOMESTIC",
      item_name: "철도 운송 운임",
      basis: "40ft 800원/km × 450km",
      note: "공시 요율",
      currency: "KRW",
      amount_min: "360000",
      amount_max: "360000",
      krw_amount_min: "360000",
      krw_amount_max: "360000",
    },
    {
      id: -1,
      section_category: "OVERSEAS_HORGAS",
      item_name: "대륙철도(TCR) 운임",
      basis: "연운항 ➔ 호르고스 구간 기준",
      note: "변동 가능",
      currency: "USD",
      amount_min: "2571",
      amount_max: "3465",
      krw_amount_min: "3620000",
      krw_amount_max: "4880000",
    },
    {
      id: -2,
      section_category: "OVERSEAS_HORGAS",
      item_name: "연운항 터미널 하역·보관료",
      basis: "중국 항만 공시 요율",
      note: "변동 가능",
      currency: "USD",
      amount_min: "140",
      amount_max: "175",
      krw_amount_min: "198000",
      krw_amount_max: "246000",
    },
    {
      id: -4,
      section_category: "OVERSEAS_DEST",
      item_name: `호르고스 ➔ ${destinationKr} (도착지 철도 운임)`,
      basis: `호르고스 ➔ ${destinationKr} 구간`,
      note: "공시 요율",
      currency: "USD",
      amount_min: "3929",
      amount_max: "4423",
      krw_amount_min: "5530000",
      krw_amount_max: "6220000",
    },
    {
      id: -5,
      section_category: "OTHER",
      item_name: "FIATA B/L 서류발행비",
      basis: "1건당 고정 요금",
      note: "서류 발급비",
      currency: "KRW",
      amount_min: "44000",
      amount_max: "44000",
      krw_amount_min: "44000",
      krw_amount_max: "44000",
    },
  ];
}

function groupBySection(details: AIDetailResponse[]) {
  return SECTION_ORDER.map((category) => {
    const items = details.filter((d) => d.section_category === category);
    const krwMin = items.reduce((sum, d) => sum + Number(d.krw_amount_min), 0);
    const krwMax = items.reduce((sum, d) => sum + Number(d.krw_amount_max), 0);
    return { category, items, krwMin, krwMax };
  }).filter((group) => group.items.length > 0);
}

export function computeQuoteBreakdown(quote: QuoteDetailData) {
  const existingCategories = new Set(
    quote.ai_details.map((d) => d.section_category),
  );
  const mergedDetails = [
    ...quote.ai_details,
    ...getMockDetails(destinationLabel(quote.destination)).filter(
      (d) => !existingCategories.has(d.section_category),
    ),
  ];
  const groups = groupBySection(mergedDetails);
  const totalMin = groups.reduce((sum, g) => sum + g.krwMin, 0);
  const totalMax = groups.reduce((sum, g) => sum + g.krwMax, 0);

  const railData = RAIL_GROUP_DEFS.map((rail) => {
    const matching = groups.filter((g) => rail.categories.includes(g.category));
    const items = matching.flatMap((g) => g.items);
    const krwMin = matching.reduce((sum, g) => sum + g.krwMin, 0);
    const krwMax = matching.reduce((sum, g) => sum + g.krwMax, 0);
    return { ...rail, items, krwMin, krwMax };
  }).filter((rail) => rail.items.length > 0);

  const domesticItems = railData.find((r) => r.key === "domestic")?.items ?? [];
  const overseasItems = railData.find((r) => r.key === "overseas")?.items ?? [];
  const otherItems = railData.find((r) => r.key === "other")?.items ?? [];

  const containerBreakdown = quote.containers.reduce<
    Record<string, { quantity: number; items: string[] }>
  >((acc, c) => {
    const entry = acc[c.container_type] ?? { quantity: 0, items: [] };
    entry.quantity += c.quantity;
    entry.items.push(c.item_name);
    acc[c.container_type] = entry;
    return acc;
  }, {});

  return {
    railData,
    domesticItems,
    overseasItems,
    otherItems,
    containerBreakdown,
    totalMin,
    totalMax,
  };
}
