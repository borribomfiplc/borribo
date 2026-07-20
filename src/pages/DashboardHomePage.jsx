import React from "react";
import {
  Users, Clock, CalendarDays, Calendar, BarChart3, ChevronDown, ChevronRight,
  UserPlus, FileText, ScanLine, Cake, Gift
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { COLORS } from "../data/theme";
import { weekData, leaveData, checkins, birthdays } from "../data/mockData";
import StatCard from "../components/shared/StatCard";

export default function DashboardHomePage({ setActive, setOpenSection, setEditingEmployee }) {
  const total = leaveData.reduce((a, b) => a + b.value, 0);

  return (
    <>
          <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ផ្ទាំងគ្រប់គ្រង</h1>
              <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
                សូមស្វាគមន៍មកវិញ ចាន់ បូរ៉ា! នេះជាសកម្មភាពថ្ងៃនេះ។
              </p>
            </div>
            <button className="flex items-center gap-2 bg-white border border-[#EBEDF3] rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-[#1E2333] whitespace-nowrap">
              <Calendar size={15} className="shrink-0" />
              ១៩ កក្កដា ២០២៦
              <ChevronDown size={14} className="text-[#B4B7C6] shrink-0" />
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Users}
              label="មានវត្តមានថ្ងៃនេះ"
              value="128"
              sub="80.0% នៃចំនួនសរុប"
              iconBg={COLORS.primaryLight}
              iconColor={COLORS.primary}
              chartColor={COLORS.primary}
            />
            <StatCard
              icon={Clock}
              label="មកយឺត"
              value="16"
              sub="10.0% នៃចំនួនសរុប"
              iconBg={COLORS.greenLight}
              iconColor={COLORS.green}
              chartColor={COLORS.green}
            />
            <StatCard
              icon={UserPlus}
              label="អវត្តមាន"
              value="12"
              sub="7.5% នៃចំនួនសរុប"
              iconBg={COLORS.amberLight}
              iconColor={COLORS.accent}
              chartColor={COLORS.accent}
            />
            <StatCard
              icon={CalendarDays}
              label="ឈប់សម្រាក"
              value="8"
              sub="5.0% នៃចំនួនសរុប"
              iconBg={COLORS.purpleLight}
              iconColor={COLORS.purple}
              chartColor={COLORS.purple}
            />
          </div>

          {/* Chart + Checkins + Announcements */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEDF3] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1E2333] text-[15px]">
                  ទិដ្ឋភាពទូទៅវត្តមាន <span className="text-[#8A8FA3] font-normal text-sm">(សប្តាហ៍នេះ)</span>
                </h3>
                <div className="flex items-center gap-4 text-xs text-[#8A8FA3]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.primary }} />មានវត្តមាន</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.accent }} />យឺត</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.red }} />អវត្តមាន</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.purple }} />ច្បាប់</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={weekData}>
                  <CartesianGrid stroke={COLORS.line} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: COLORS.sub }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: COLORS.sub }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.line}`, fontSize: 12 }} />
                  <Line type="monotone" dataKey="present" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="late" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="absent" stroke={COLORS.red} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="leave" stroke={COLORS.purple} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5 flex flex-col">
              <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4">សកម្មភាពចូលធ្វើការថ្ងៃនេះ</h3>
              <div className="flex-1 flex flex-col gap-4">
                {checkins.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                      {c.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1E2333] truncate">{c.name}</div>
                      <div className="text-xs text-[#8A8FA3] truncate">{c.role}</div>
                    </div>
                    <span className="text-[11px] font-medium text-[#3FA66B] bg-[#E9F7EF] rounded-full px-2.5 py-1 shrink-0">
                      {c.time}
                    </span>
                  </div>
                ))}
              </div>
              <button className="mt-4 text-sm font-medium text-[#2A3F8F] border border-[#EBEDF3] rounded-xl py-2.5 flex items-center justify-center gap-1.5">
                មើលការចូលធ្វើការទាំងអស់ <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Leave summary + Quick actions + Birthdays */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
              <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4">សង្ខេបច្បាប់ឈប់សម្រាក</h3>
              <div className="flex items-center gap-6">
                <div className="relative w-[130px] h-[130px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leaveData} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={2}>
                        {leaveData.map((d, i) => (
                          <Cell key={i} fill={d.color} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] text-[#8A8FA3]">សរុប</span>
                    <span className="text-xl font-bold text-[#1E2333]">{total}</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2.5">
                  {leaveData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-[#5B5F73]">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="text-[#1E2333] font-medium">
                        {d.value} <span className="text-[#B4B7C6]">({((d.value / total) * 100).toFixed(1)}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
              <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4">សកម្មភាពរហ័ស</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: UserPlus, label: "បន្ថែមបុគ្គលិក", onClick: () => { setEditingEmployee(null); setActive("បន្ថែមបុគ្គលិក"); } },
                  { icon: FileText, label: "សុំច្បាប់", onClick: () => { setOpenSection("leave"); setActive("សំណើសុំច្បាប់"); } },
                  { icon: Clock, label: "កត់ត្រាវត្តមាន", onClick: () => setActive("វត្តមានប្រចាំថ្ងៃ") },
                  { icon: BarChart3, label: "បង្កើតរបាយការណ៍", onClick: () => { setOpenSection("reports"); setActive("របាយការណ៍វត្តមាន"); } },
                  { icon: Calendar, label: "បន្ថែមថ្ងៃឈប់សម្រាក", onClick: () => { setOpenSection("settings"); setActive("ថ្ងៃឈប់សម្រាក"); } },
                  { icon: ScanLine, label: "ស្កេន QR កូដ", onClick: () => { setOpenSection("settings"); setActive("GPS និង QR"); } },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    className="flex flex-col items-center gap-2 border border-[#EBEDF3] rounded-xl py-4 hover:bg-[#F7F8FB] transition-colors"
                  >
                    <a.icon size={19} className="text-[#2A3F8F]" />
                    <span className="text-[12px] text-[#5B5F73] font-medium text-center px-1">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1E2333] text-[15px] flex items-center gap-2">
                  <Cake size={16} className="text-[#E8A33D]" /> ថ្ងៃខួបកំណើតថ្ងៃនេះ
                </h3>
                <button className="text-xs text-[#2A3F8F] font-medium">មើលទាំងអស់</button>
              </div>
              <div className="flex flex-col gap-4">
                {birthdays.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FDF3E3] text-[#E8A33D] text-xs font-bold flex items-center justify-center shrink-0">
                      {b.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1E2333] truncate">{b.name}</div>
                      <div className="text-xs text-[#8A8FA3] truncate">{b.role}</div>
                    </div>
                    <Gift size={16} className="text-[#D9614F] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
    </>
  );
}
