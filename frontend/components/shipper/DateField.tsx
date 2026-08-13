"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useDismissableDropdown } from "@/hooks/useDismissableDropdown";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getCalendarCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  return cells;
}

export function DateField({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
}) {
  const { ref, isOpen, setIsOpen } = useDismissableDropdown<HTMLDivElement>();
  const today = new Date();
  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth());

  const cells = getCalendarCells(viewYear, viewMonth);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-14 w-full items-center gap-2 rounded-lg border border-gray-300 px-4 text-left text-base"
      >
        <Calendar size={20} className="shrink-0 text-gray-400" />
        <span className={value ? "" : "text-gray-500"}>
          {value ? formatDate(value) : "이용 예상 날짜 선택"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="flex size-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-base font-semibold">
              {viewYear}년 {viewMonth + 1}월
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="flex size-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 text-center text-sm text-gray-400">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="flex h-7 items-center justify-center">
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1.5 text-center text-base">
            {cells.map((day, index) => {
              if (day === null) return <span key={index} />;

              const cellDate = new Date(viewYear, viewMonth, day);
              const isSelected = value && isSameDay(cellDate, value);
              const isToday = isSameDay(cellDate, today);

              return (
                <span key={index} className="flex items-center justify-center py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(cellDate);
                      setIsOpen(false);
                    }}
                    className={`flex size-10 items-center justify-center rounded-full transition-colors duration-150 ${
                      isSelected
                        ? "bg-maincolor font-semibold text-white"
                        : isToday
                          ? "font-semibold text-maincolor hover:bg-maincolor/10"
                          : "hover:bg-maincolor/10"
                    }`}
                  >
                    {day}
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
