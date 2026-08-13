import Link from "next/link";

const CURRENT_USER_LABEL = "현대글로비스 (홍길동 팀장)";

export function ShipperHeader() {
  return (
    <header className="flex h-[80px] w-full items-center justify-between bg-[#ffffff] px-5">
      <Link href="/" className="text-[26px] font-black text-maincolor">
        Q-RAIL
      </Link>
      <span className="rounded-full border border-white/40 bg-white/60 px-4 py-2 text-sm font-semibold text-[#171717] backdrop-blur-md">
        {CURRENT_USER_LABEL}
      </span>
    </header>
  );
}
