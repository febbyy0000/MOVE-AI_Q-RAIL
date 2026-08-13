"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/records", label: "대시보드", icon: LayoutDashboard },
];

// TODO: 로그인 기능 붙으면 실제 로그인한 관리자 이름으로 교체
const ADMIN_NAME = "관리자";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="flex h-[80px] w-full items-center justify-between border-b border-gray-100 bg-white px-8">
        <Link href="/" className="text-[24px] font-black text-maincolor">
          Q-RAIL
        </Link>

        <span className="rounded-[20px] border border-gray-200 bg-white px-8 py-3 text-sm font-extrabold text-gray-500 shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
          {ADMIN_NAME}
        </span>
      </header>

      <div className="flex min-h-[calc(100vh-80px)] w-full">
        <aside className="flex w-64 shrink-0 flex-col gap-8 border-r border-gray-100 bg-white px-5 py-6">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors duration-150 ${
                    isActive
                      ? "bg-maincolor/10 text-maincolor"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <item.icon size={20} strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 px-10 py-10">{children}</main>
      </div>
    </div>
  );
}
