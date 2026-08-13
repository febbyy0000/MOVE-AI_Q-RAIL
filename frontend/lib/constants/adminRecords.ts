export type RecordStatus = "미등록" | "등록완료";

export type QuoteRecord = {
  id: string;
  quoteNo: string;
  company: string;
  date: string;
  status: RecordStatus;
  departure: string;
  destination: string;
  containerSummary: string;
  totalAmount: string;
};

// TODO: 백엔드에 견적 목록/상세 조회 API가 생기면 이 목업 데이터를 실제 API 응답으로 교체
export const MOCK_RECORDS: QuoteRecord[] = [
  {
    id: "Q-260915-0031",
    quoteNo: "Q-260915-0031",
    company: "유신 포워딩",
    date: "2026-08-08",
    status: "미등록",
    departure: "오봉역",
    destination: "알마티",
    containerSummary: "40ft × 3개",
    totalAmount: "14,081,657원 ~ 14,694,137원",
  },
  {
    id: "Q-260915-0020",
    quoteNo: "Q-260915-0020",
    company: "현대글로비스",
    date: "2026-08-14",
    status: "등록완료",
    departure: "오봉역",
    destination: "타슈켄트",
    containerSummary: "40ft × 2개",
    totalAmount: "9,884,250원",
  },
];
