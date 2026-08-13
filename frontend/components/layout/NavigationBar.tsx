import Link from "next/link";

const NAV_LINKS = [
  { label: "서비스 소개", href: "#" },
  { label: "운송 구간", href: "#" },
  { label: "산정 기준", href: "#" },
];

export function NavigationBar() {
  return (
    <header className="absolute top-0 left-0 z-20 flex h-[104px] w-full items-center justify-between bg-transparent px-10">
      <div className="flex items-center gap-16">
        <span className="text-[26px] font-black text-white">Q-RAIL</span>
        <nav className="flex gap-12">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[18px] font-bold text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
