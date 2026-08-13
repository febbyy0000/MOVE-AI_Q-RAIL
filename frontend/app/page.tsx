import Image from "next/image";
import Link from "next/link";
import { NavigationBar } from "@/components/layout/NavigationBar";
import { UserSelector } from "@/components/shipper/UserSelector";

export default function HomePage() {
  return (
    <div className="bg-hero-gradient relative flex h-screen w-full items-center justify-between overflow-hidden px-20">
      <NavigationBar />

      <div className="relative z-10 max-w-xl">
        <h1 className="text-[50px] font-black text-white whitespace-nowrap">
          Speed + Efficiency
        </h1>
        <p className="mt-6 text-[26px] font-extrabold text-white/90">
          최대 2주 소요되던 견적 대기 시간을 &apos;즉시&apos; 로
          <br />
          단축하는 투명하고 신속한 시스템을 제공합니다
        </p>
        <div className="mt-10">
          <UserSelector />
        </div>
        <Link
          href="/request"
          className="mt-4 inline-flex h-[56px] items-center justify-center rounded-full bg-white px-8 text-[18px] font-extrabold text-[#0b1030] shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-transform hover:scale-105"
        >
          지금 견적 요청하기
        </Link>
      </div>

      {/* <div className="relative z-10 flex flex-1 justify-end">
        <Image
          src="/images/train.png"
          alt="화물 열차"
          width={1570}
          height={672}
          priority
          unoptimized
          className="animate-float-train h-auto w-[1200px] max-w-none drop-shadow-[0_30px_50px_rgba(0,10,60,0.5)]"
        />
      </div> */}
    </div>
  );
}
