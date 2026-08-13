"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDismissableDropdown } from "@/hooks/useDismissableDropdown";
import { TEST_USERS, getSelectedTestUser, setSelectedTestUser } from "@/lib/constants/testUsers";

export function UserSelector() {
  const router = useRouter();
  const { ref, isOpen, setIsOpen } = useDismissableDropdown<HTMLDivElement>();
  const [selectedLabel, setSelectedLabel] = useState(TEST_USERS[0].label);

  useEffect(() => {
    setSelectedLabel(getSelectedTestUser().label);
  }, []);

  const selected = TEST_USERS.find((u) => u.label === selectedLabel) ?? TEST_USERS[0];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-colors duration-150 hover:bg-white/20"
      >
        {selected.label}
        <span className="text-white/60">({selected.company})</span>
      </button>

      {isOpen && (
        <ul className="absolute top-full left-0 z-20 mt-2 w-56 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-lg">
          {TEST_USERS.map((user) => (
            <li key={user.label}>
              <button
                type="button"
                onClick={() => {
                  setSelectedTestUser(user.label);
                  setSelectedLabel(user.label);
                  setIsOpen(false);
                }}
                className="flex h-11 w-full items-center justify-between px-4 text-left text-sm font-medium transition-colors duration-150 hover:bg-maincolor/10"
              >
                <span className="text-gray-900">{user.label}</span>
                <span className="text-xs text-gray-400">{user.company}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/admin/records");
              }}
              className="flex h-11 w-full items-center justify-between px-4 text-left text-sm font-medium transition-colors duration-150 hover:bg-purple-600/10"
            >
              <span className="text-gray-900">관리자</span>
              <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-600">
                관리자
              </span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
