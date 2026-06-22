"use client";

import { useMemo } from "react";

interface TimetableHeaderProps {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  isAdmin?: boolean;
  onOpenManagement?: () => void;
  onAutoSchedule?: () => void;
}

function getWeekDays(anchor: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  });
}

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TimetableHeader({
  weekStart, onPrevWeek, onNextWeek, onToday, isAdmin, onOpenManagement, onAutoSchedule,
}: TimetableHeaderProps) {
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const dateRange = `${toDateInput(days[0])} ~ ${toDateInput(days[6])}`;

  const isCurrentWeek = useMemo(() => {
    const monday = getWeekDays(weekStart);
    return toDateInput(monday[0]) === toDateInput(getWeekDays(new Date())[0]);
  }, [weekStart]);

  return (
    <div className="flex flex-col gap-3 pb-4 border-b border-border">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold text-text tracking-tight">
          Lịch trực theo tuần
          <span className="hidden print:inline ml-4 text-sm font-mono font-normal text-text-3">{dateRange}</span>
        </h1>
        <div className="flex items-center gap-2 text-xs text-text-3 print:hidden">
          <span className="font-mono">{dateRange}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrevWeek}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-text-2 hover:bg-surface-2 transition border border-border"
          >
            &larr; Tuần trước
          </button>
          <button
            onClick={onToday}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition border ${
              isCurrentWeek
                ? "bg-primary text-bg border-primary"
                : "text-primary border-primary/30 hover:bg-primary/10"
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={onNextWeek}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-text-2 hover:bg-surface-2 transition border border-border"
          >
            Tuần sau &rarr;
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              {onAutoSchedule && (
                <button
                  onClick={onAutoSchedule}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition border border-primary/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Gợi ý lịch
                </button>
              )}
              {onOpenManagement && (
                <button
                  onClick={onOpenManagement}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-2 hover:bg-surface-2 transition border border-border"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Quản lý
                </button>
              )}
            </>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-2 hover:bg-surface-2 transition border border-border"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10V5z" />
            </svg>
            In lịch
          </button>
        </div>
      </div>
    </div>
  );
}
