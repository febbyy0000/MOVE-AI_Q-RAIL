import ExcelJS from "exceljs";
import type { AIDetailResponse, QuoteResponse } from "@/lib/api/quotes";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0B1030" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle" };
  });
}

export async function downloadQuoteExcel({
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
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Q-RAIL";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("견적서");
  sheet.columns = [
    { width: 26 },
    { width: 22 },
    { width: 18 },
    { width: 18 },
  ];

  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = "국제철도운송 운임 견적";
  sheet.getCell("A1").font = { size: 16, bold: true };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  sheet.addRow([]);
  sheet.addRow(["관리번호", quote.quote_no, "산정일", new Date(quote.created_at).toLocaleString()]);
  sheet.addRow(["출발지", quote.departure, "도착지", quote.destination]);
  sheet.addRow(["운송 희망일", quote.dispatch_date, "적용 환율", `${Number(quote.exchange_rate).toLocaleString()}원/USD`]);
  sheet.addRow([]);

  const addSection = (title: string, columns: string[], rows: (string | number)[][]) => {
    const titleRow = sheet.addRow([title]);
    sheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);
    titleRow.getCell(1).font = { bold: true, size: 13 };

    const headerRow = sheet.addRow(columns);
    styleHeaderRow(headerRow);

    rows.forEach((r) => sheet.addRow(r));
    sheet.addRow([]);
  };

  addSection(
    "1. 국내운임",
    ["컨테이너 규격", "수량", "산출운임", "비고"],
    domesticItems.map((item) => [
      item.item_name,
      item.basis ?? "",
      `${Number(item.krw_amount_min).toLocaleString()}원`,
      item.note ?? "",
    ]),
  );

  addSection(
    "2. 해외운임",
    ["항목", "산출 기준", "금액(USD)", "비고"],
    overseasItems.map((item) => [
      item.item_name,
      item.basis ?? "",
      `$${Number(item.amount_min).toLocaleString()} ~ $${Number(item.amount_max).toLocaleString()}`,
      item.note ?? "",
    ]),
  );

  addSection(
    "3. 기타",
    ["항목", "산정 기준", "금액", "비고"],
    otherItems.map((item) => [
      item.item_name,
      item.basis ?? "",
      `${Number(item.krw_amount_min).toLocaleString()}원`,
      item.note ?? "",
    ]),
  );

  const totalMin =
    domesticItems.reduce((s, i) => s + Number(i.krw_amount_min), 0) +
    overseasItems.reduce((s, i) => s + Number(i.krw_amount_min), 0) +
    otherItems.reduce((s, i) => s + Number(i.krw_amount_min), 0);
  const totalMax =
    domesticItems.reduce((s, i) => s + Number(i.krw_amount_max), 0) +
    overseasItems.reduce((s, i) => s + Number(i.krw_amount_max), 0) +
    otherItems.reduce((s, i) => s + Number(i.krw_amount_max), 0);

  const totalRow = sheet.addRow([
    "예상 총액",
    totalMin === totalMax
      ? `${totalMin.toLocaleString()}원`
      : `${totalMin.toLocaleString()}원 ~ ${totalMax.toLocaleString()}원`,
  ]);
  sheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);
  totalRow.font = { bold: true, size: 13 };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${quote.quote_no}_견적서.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
