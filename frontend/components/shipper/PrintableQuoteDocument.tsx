import type { AIDetailResponse, QuoteResponse } from "@/lib/api/quotes";

// 백엔드 domestic_calc.py 와 동일한 공시 요율 (코레일 컨테이너 운임표 기준)
const DOMESTIC_RATE_PER_KM: Record<string, number> = {
  "20ft": 516,
  "40ft": 800,
  "45ft": 946,
};
const DOMESTIC_DISTANCE_KM = 450;

function formatKrw(n: number) {
  return `${Math.round(n).toLocaleString()}원`;
}

function formatRange(min: number, max: number, unit: "원" | "USD") {
  const fmt = (n: number) =>
    unit === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()}원`;
  return min === max ? fmt(min) : `${fmt(min)} ~ ${fmt(max)}`;
}

export function PrintableQuoteDocument({
  quote,
  domesticItems,
  overseasItems,
  otherItems,
}: {
  quote: QuoteResponse;
  domesticItems: AIDetailResponse[];
  overseasItems: AIDetailResponse[];
  otherItems: AIDetailResponse[];
}) {
  const issuedAt = new Date(quote.created_at);
  const validUntil = new Date(issuedAt);
  validUntil.setDate(validUntil.getDate() + 30);

  // 컨테이너 규격별 국내 철도 운임(왕복표 기준 산출운임) — 실제 공시 요율로 계산.
  // TODO: 할인율은 백엔드 문서 생성 API가 내려주는 값으로 교체 예정. 현재는 할인 미적용(0%)으로 표시.
  const freightRows = quote.containers.map((c) => {
    const rate = DOMESTIC_RATE_PER_KM[c.container_type] ?? 0;
    const amount = rate * DOMESTIC_DISTANCE_KM * c.quantity;
    return {
      spec: c.container_type,
      rate,
      distance: DOMESTIC_DISTANCE_KM,
      quantity: c.quantity,
      amount,
      discounted: amount, // TODO: 실제 할인 로직 반영 전까지 동일값
    };
  });
  const freightTotal = freightRows.reduce((sum, r) => sum + r.amount, 0);
  const freightDiscountedTotal = freightRows.reduce((sum, r) => sum + r.discounted, 0);

  // 하역/장치료/정보입력료/VAT 등 국내 부대비용 (freight 이외 항목)
  const domesticSurcharges = domesticItems.filter(
    (item) => !item.item_name.includes("철도 운송 운임"),
  );
  const domesticTotalKrw =
    freightDiscountedTotal +
    domesticSurcharges.reduce((sum, item) => sum + Number(item.krw_amount_min), 0);

  const overseasMinUsd = overseasItems.reduce((sum, i) => sum + Number(i.amount_min), 0);
  const overseasMaxUsd = overseasItems.reduce((sum, i) => sum + Number(i.amount_max), 0);
  const overseasMinKrw = overseasItems.reduce((sum, i) => sum + Number(i.krw_amount_min), 0);
  const overseasMaxKrw = overseasItems.reduce((sum, i) => sum + Number(i.krw_amount_max), 0);

  const otherTotalKrw = otherItems.reduce((sum, i) => sum + Number(i.krw_amount_min), 0);

  const grandMin = domesticTotalKrw + overseasMinKrw + otherTotalKrw;
  const grandMax = domesticTotalKrw + overseasMaxKrw + otherTotalKrw;

  return (
    <div className="mx-auto w-full max-w-[900px] bg-white px-2 text-[13px] text-gray-900">
      {/* Letterhead */}
      <div className="flex items-center justify-between border-b-2 border-[#0b1030] pb-3">
        <span className="text-2xl font-extrabold text-[#003C7E]">KORAIL</span>
        <span className="text-xs text-gray-400">
          {quote.quote_no} 발행 견적서 (본 문서는 사전 예상 금액이며 확정 청구서가 아닙니다)
        </span>
      </div>

      <h1 className="mt-6 text-center text-2xl font-extrabold tracking-widest">
        국 제 철 도 운 송 운 임 견 적
      </h1>
      <p className="mt-2 text-center text-xs text-gray-400">
        {issuedAt.toLocaleDateString()}
      </p>

      <div className="mt-6 flex justify-between text-sm">
        <span>
          관리번호 <b>{quote.quote_no}</b>
        </span>
        <span>
          유효기간{" "}
          <b>
            {issuedAt.toLocaleDateString()} ~ {validUntil.toLocaleDateString()}
          </b>
        </span>
        {/* TODO: 수신 회사명 — 백엔드 문서 생성 API가 유저 ID로 조회해 내려줄 예정 */}
        <span>
          수신 <b>귀중</b>
        </span>
      </div>

      {/* 1. 국내운임 */}
      <SectionBar>1. 국내운임 {quote.departure} → 부산항 (국내철도)</SectionBar>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <Th>컨테이너 규격</Th>
            <Th>임률(원/km)</Th>
            <Th>거리(km)</Th>
            <Th>수량</Th>
            <Th>산출운임</Th>
            <Th>할인 적용 후</Th>
          </tr>
        </thead>
        <tbody>
          {freightRows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100">
              <Td>{row.spec}</Td>
              <Td align="right">{row.rate.toLocaleString()}원</Td>
              <Td align="right">{row.distance}</Td>
              <Td align="right">{row.quantity}개</Td>
              <Td align="right">{formatKrw(row.amount)}</Td>
              <Td align="right">{formatKrw(row.discounted)}</Td>
            </tr>
          ))}
          {domesticSurcharges.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 text-gray-500">
              <Td colSpan={4}>{item.item_name}</Td>
              <Td align="right" colSpan={2}>
                {formatKrw(Number(item.krw_amount_min))}
              </Td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-bold">
            <Td colSpan={4}>국내운임 합계</Td>
            <Td align="right">{formatKrw(freightTotal)}</Td>
            <Td align="right">{formatKrw(domesticTotalKrw)}</Td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-gray-400">
        규격별 임률(코레일 컨테이너 운임표 기준) : 20FT 516원/km · 40FT 800원/km · 45FT 946원/km.
        국내철도운임 할인은 포워딩사(개별 기업)마다 다르게 적용됩니다.
      </p>

      {/* 2. 해외운임 */}
      <SectionBar>
        2. 해외운임 연운항 → {quote.destination} (국외철도)
      </SectionBar>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <Th>항목</Th>
            <Th>산출 기준</Th>
            <Th align="right">금액(USD)</Th>
            <Th>비고</Th>
          </tr>
        </thead>
        <tbody>
          {overseasItems.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <Td>{item.item_name}</Td>
              <Td>{item.basis}</Td>
              <Td align="right">
                {formatRange(Number(item.amount_min), Number(item.amount_max), "USD")}
              </Td>
              <Td>{item.note}</Td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-bold">
            <Td colSpan={2}>해외운임 합계</Td>
            <Td align="right" colSpan={2}>
              {formatRange(overseasMinUsd, overseasMaxUsd, "USD")}
            </Td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-gray-400">
        국외 철도운임은 달러(USD)로 별도 납부합니다. 해외 구간 금액은 운행 실적 및 고시 갱신에
        따라 변동될 수 있습니다.
      </p>

      {/* 3. 기타 */}
      <SectionBar>3. 기타 서류 (전 구간 공통)</SectionBar>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <Th>항목</Th>
            <Th>산정 기준</Th>
            <Th align="right">금액</Th>
          </tr>
        </thead>
        <tbody>
          {otherItems.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <Td>{item.item_name}</Td>
              <Td>{item.basis}</Td>
              <Td align="right">{formatKrw(Number(item.krw_amount_min))}</Td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-bold">
            <Td colSpan={2}>기타 합계</Td>
            <Td align="right">{formatKrw(otherTotalKrw)}</Td>
          </tr>
        </tbody>
      </table>

      {/* 예상 총 운송비용 */}
      <SectionBar>예상 총 운송비용</SectionBar>
      <p className="text-[11px] text-gray-400">
        적용환율 기준일: {issuedAt.toLocaleDateString()} · {Number(quote.exchange_rate).toLocaleString()}원/USD
      </p>
      <table className="mt-1 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <Th>구분</Th>
            <Th align="right">금액</Th>
            <Th align="right">적용 환율</Th>
            <Th align="right">원화 환산액</Th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <Td>국내운임</Td>
            <Td align="right">{formatKrw(domesticTotalKrw)}</Td>
            <Td align="right">-</Td>
            <Td align="right">{formatKrw(domesticTotalKrw)}</Td>
          </tr>
          <tr className="border-b border-gray-100">
            <Td>해외운임</Td>
            <Td align="right">{formatRange(overseasMinUsd, overseasMaxUsd, "USD")}</Td>
            <Td align="right">{Number(quote.exchange_rate).toLocaleString()}원/USD</Td>
            <Td align="right">{formatRange(overseasMinKrw, overseasMaxKrw, "원")}</Td>
          </tr>
          <tr className="border-b border-gray-100">
            <Td>기타</Td>
            <Td align="right">{formatKrw(otherTotalKrw)}</Td>
            <Td align="right">-</Td>
            <Td align="right">{formatKrw(otherTotalKrw)}</Td>
          </tr>
          <tr className="bg-[#0b1030] font-bold text-white">
            <Td colSpan={3}>예상 총액</Td>
            <Td align="right">{formatRange(grandMin, grandMax, "원")}</Td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
        실제 결제는 국내운임(원화)·해외운임(달러) 각각 별도 청구되며, 해외운임 결제 시점 환율에
        따라 금액이 달라질 수 있습니다. 국내운임은 코레일 컨테이너 운임표(규격별 km당 임률)에
        근거하며, 해외 구간 금액은 운행 실적 및 고시 갱신에 따라 변동될 수 있습니다.
      </p>

      {/* TODO: 문의처 담당자/이메일 — 백엔드 문서 생성 API가 내려주는 실제 담당자 정보로 교체 예정 */}
      <p className="mt-6 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
        문의 한국철도공사 물류마케팅처 · {quote.quote_no}
      </p>
    </div>
  );
}

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 mb-1 bg-[#0b1030] px-3 py-1.5 text-sm font-bold text-white">
      {children}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  colSpan,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-gray-200 px-3 py-2 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}
