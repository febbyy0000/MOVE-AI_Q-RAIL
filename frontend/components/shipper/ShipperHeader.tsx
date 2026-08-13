"use client";

import { useState } from "react";
import Link from "next/link";
import { useDismissableDropdown } from "@/hooks/useDismissableDropdown";

type AccountOption = {
  label: string;
  role: "user" | "admin";
};

const ACCOUNT_OPTIONS: AccountOption[] = [
  { label: "유저1", role: "user" },
  { label: "유저2", role: "user" },
  { label: "유저3", role: "user" },
  { label: "관리자", role: "admin" },
];

export function ShipperHeader() {
  const { ref, isOpen, setIsOpen } = useDismissableDropdown<HTMLDivElement>();
  const [selected, setSelected] = useState<AccountOption>(ACCOUNT_OPTIONS[0]);

  return (
    <header className="flex h-[80px] w-full items-center justify-between bg-[#ffffff] px-5">
      <Link href="/" className="text-[26px] font-black text-maincolor">
        Q-RAIL
      </Link>

      <div ref={ref} className="relative mr-6">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-[20px] border border-gray-200 bg-white px-12 py-3 text-sm font-extrabold text-gray-500 shadow-[0_2px_6px_rgba(0,0,0,0.1)] transition-colors duration-150 hover:bg-maincolor hover:text-white"
        >
          {selected.label}
        </button>

        {isOpen && (
          <ul className="absolute top-full right-0 z-20 mt-2 w-40 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-lg">
            {ACCOUNT_OPTIONS.map((option) => {
              const isAdmin = option.role === "admin";

              return (
                <li key={option.label}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(option);
                      setIsOpen(false);
                    }}
                    className={`flex h-11 w-full items-center justify-between px-4 text-left text-sm font-medium transition-colors duration-150 ${
                      isAdmin ? "hover:bg-purple-600/10" : "hover:bg-maincolor/10"
                    }`}
                  >
                    <span className="text-gray-900">{option.label}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                        isAdmin
                          ? "bg-purple-100 text-purple-600"
                          : "bg-maincolor/10 text-maincolor"
                      }`}
                    >
                      {isAdmin ? "관리자" : "유저"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </header>
  );
}
