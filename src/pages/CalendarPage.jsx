import React, { useState } from "react";
import {
  CalendarDays, ChevronRight, ChevronLeft, CheckCircle2
} from "lucide-react";
import { monthNamesKh, dayLabelsKh, TODAY_ISO } from "../data/mockData";

export default function CalendarPage({ leaveRequests, holidays }) {
  const [viewDate, setViewDate] = useState(new Date(2026, 6, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const holidayMap = {};
  holidays
    .filter((h) => h.dateISO.startsWith(monthPrefix))
    .forEach((h) => {
      holidayMap[h.dateISO] = h;
    });

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => setViewDate(new Date(2026, 6, 1));

  const upcomingHolidays = holidays.filter((h) => h.dateISO >= TODAY_ISO).slice(0, 5);
  const approvedLeaves = leaveRequests.filter((r) => r.status === "បានអនុម័ត");

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ប្រតិទិន</h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">ថ្ងៃឈប់សម្រាកក្រុមហ៊ុន និងសំណើច្បាប់ដែលបានអនុម័ត</p>
        </div>
        <button
          onClick={goToday}
          className="text-xs sm:text-sm font-medium text-[#2A3F8F] border border-[#EBEDF3] rounded-xl px-3.5 py-2 sm:py-2.5"
        >
          ថ្ងៃនេះ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Month grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={goPrev} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]">
              <ChevronLeft size={17} />
            </button>
            <h3 className="font-semibold text-[#1E2333] text-[15px]">
              {monthNamesKh[month]} {year}
            </h3>
            <button onClick={goNext} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {dayLabelsKh.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-medium text-[#8A8FA3] py-1.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const iso = `${monthPrefix}-${String(d).padStart(2, "0")}`;
              const holiday = holidayMap[iso];
              const isToday = iso === TODAY_ISO;
              return (
                <div
                  key={i}
                  title={holiday ? holiday.name : undefined}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm border ${
                    isToday
                      ? "border-[#2A3F8F] bg-[#EEF1FB] text-[#2A3F8F] font-bold"
                      : holiday
                      ? "border-transparent bg-[#FDF3E3] text-[#E8A33D] font-semibold"
                      : "border-transparent text-[#5B5F73]"
                  }`}
                >
                  <span>{d}</span>
                  {holiday && <span className="w-1.5 h-1.5 rounded-full bg-[#E8A33D]" />}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#EBEDF3] text-xs text-[#8A8FA3]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-[#2A3F8F]" /> ថ្ងៃនេះ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E8A33D]" /> ថ្ងៃឈប់សម្រាក
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
            <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4 flex items-center gap-2">
              <CalendarDays size={16} className="text-[#E8A33D]" /> ថ្ងៃឈប់សម្រាកខាងមុខ
            </h3>
            <div className="flex flex-col gap-3.5">
              {upcomingHolidays.map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FDF3E3] text-[#E8A33D] text-[11px] font-bold flex flex-col items-center justify-center shrink-0 leading-none">
                    <span>{h.dateISO.slice(8, 10)}</span>
                    <span>{monthNamesKh[Number(h.dateISO.slice(5, 7)) - 1].slice(0, 3)}</span>
                  </div>
                  <span className="text-xs text-[#5B5F73] leading-snug pt-1.5">{h.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
            <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#3FA66B]" /> ច្បាប់ដែលបានអនុម័ត
            </h3>
            <div className="flex flex-col gap-3.5">
              {approvedLeaves.length === 0 && (
                <p className="text-xs text-[#8A8FA3]">មិនទាន់មានសំណើច្បាប់ដែលបានអនុម័តទេ</p>
              )}
              {approvedLeaves.map((r) => (
                <div key={r.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#E9F7EF] text-[#3FA66B] text-xs font-bold flex items-center justify-center shrink-0">
                    {r.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1E2333] truncate">{r.name}</div>
                    <div className="text-xs text-[#8A8FA3]">
                      {r.leaveType} · {r.startDate} – {r.endDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
