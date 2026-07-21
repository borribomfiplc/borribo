import React, { useState } from "react";
import {
  Clock, Search, ChevronDown, X, Pencil, CheckCircle2, XCircle, AlertCircle, PlayCircle
} from "lucide-react";
import { COLORS } from "../data/theme";
import { attendanceStatusStyle } from "../data/mockData";
import { FieldLabel, TextField, SelectField } from "../components/shared/FormFields";
import { usePagination } from "../hooks/usePagination";
import PaginationBar from "../components/shared/PaginationBar";
import StatCard from "../components/shared/StatCard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { calculateAttendanceMetrics, DEFAULT_WORKING_HOURS, todayISO } from "../utils/attendance";

export default function DailyAttendancePage({ employees, attendanceToday, setAttendanceToday }) {
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("ទាំងអស់");
  const [statusFilter, setStatusFilter] = useState("ទាំងអស់");
  const [showManual, setShowManual] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [manualForm, setManualForm] = useState({ employeeId: "", checkIn: "08:00", checkOut: "17:00", status: "មានវត្តមាន" });

  const branches = ["ទាំងអស់", ...Array.from(new Set(attendanceToday.map((a) => a.branch)))];
  const statuses = ["ទាំងអស់", "មានវត្តមាន", "យឺត", "អវត្តមាន", "ច្បាប់"];

  const filtered = attendanceToday.filter((a) => {
    const matchesQuery = a.name.includes(query) || a.id.toLowerCase().includes(query.toLowerCase());
    const matchesBranch = branchFilter === "ទាំងអស់" || a.branch === branchFilter;
    const matchesStatus = statusFilter === "ទាំងអស់" || a.status === statusFilter;
    return matchesQuery && matchesBranch && matchesStatus;
  });

  const { page, setPage, totalPages, totalItems, pageSize, pageItems: paged } = usePagination(filtered);

  const counts = {
    present: attendanceToday.filter((a) => a.status === "មានវត្តមាន").length,
    late: attendanceToday.filter((a) => a.status === "យឺត").length,
    absent: attendanceToday.filter((a) => a.status === "អវត្តមាន").length,
    leave: attendanceToday.filter((a) => a.status === "ច្បាប់").length,
  };
  const total = attendanceToday.length || 1;
  const todayLabel = new Intl.DateTimeFormat("km-KH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(new Date());

  const openManualEntry = () => {
    setManualForm((form) => ({ ...form, employeeId: form.employeeId || employees[0]?.id || "" }));
    setShowManual(true);
  };

  const editRecord = (record) => {
    setManualForm({ employeeId: record.id, checkIn: record.checkIn === "—" ? "08:00" : record.checkIn, checkOut: record.checkOut === "—" ? "17:00" : record.checkOut, status: record.status });
    setEditingRecord(record.id);
    setShowManual(true);
  };

  const saveManualEntry = async () => {
    const employee = employees.find((item) => item.id === manualForm.employeeId);
    if (!employee) return;
    const dateISO = todayISO();
    const absent = manualForm.status === "អវត្តមាន" || manualForm.status === "ច្បាប់";
    let metrics = {};
    if (!absent) {
      try {
        const settings = await getDoc(doc(db, "settings", "workingHours"));
        const workingHours = settings.exists() ? settings.data() : DEFAULT_WORKING_HOURS;
        metrics = calculateAttendanceMetrics({
          shift: employee.shift,
          workingHours,
          checkInAt: new Date(`${dateISO}T${manualForm.checkIn}:00+07:00`),
          checkOutAt: new Date(`${dateISO}T${manualForm.checkOut}:00+07:00`),
        });
      } catch {
        metrics = calculateAttendanceMetrics({
          shift: employee.shift,
          workingHours: DEFAULT_WORKING_HOURS,
          checkInAt: new Date(`${dateISO}T${manualForm.checkIn}:00+07:00`),
          checkOutAt: new Date(`${dateISO}T${manualForm.checkOut}:00+07:00`),
        });
      }
    }
    const nextRecord = {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      branch: employee.branch,
      shift: employee.shift === "ល្ងាច" ? "ល្ងាច" : "ព្រឹក",
      checkIn: absent ? "—" : manualForm.checkIn,
      checkOut: absent ? "—" : manualForm.checkOut,
      checkInClientAt: absent ? null : `${dateISO}T${manualForm.checkIn}:00+07:00`,
      checkOutClientAt: absent ? null : `${dateISO}T${manualForm.checkOut}:00+07:00`,
      hours: absent ? "—" : metrics.hours,
      status: absent ? manualForm.status : metrics.status,
      ...metrics,
      dateISO,
      recordId: `${employee.id}_${dateISO}`,
      updatedAt: new Date().toISOString(),
    };
    await setAttendanceToday((records) => {
      const exists = records.some((record) => record.id === employee.id);
      return exists
        ? records.map((record) => (record.id === employee.id ? { ...record, ...nextRecord } : record))
        : [nextRecord, ...records];
    });
    setEditingRecord(null);
    setShowManual(false);
  };

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">វត្តមានប្រចាំថ្ងៃ</h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">{todayLabel} · បច្ចុប្បន្នភាពរហូតដល់ម៉ោងនេះ</p>
        </div>
        <button
          onClick={openManualEntry}
          className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap"
          style={{ background: COLORS.primary }}
        >
          <PlayCircle size={16} />
          កត់ត្រាដោយដៃ
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard
          icon={CheckCircle2}
          label="មានវត្តមាន"
          value={counts.present}
          sub={`${((counts.present / total) * 100).toFixed(0)}% នៃចំនួនសរុប`}
          iconBg={COLORS.greenLight}
          iconColor={COLORS.green}
          chartColor={COLORS.green}
        />
        <StatCard
          icon={AlertCircle}
          label="មកយឺត"
          value={counts.late}
          sub={`${((counts.late / total) * 100).toFixed(0)}% នៃចំនួនសរុប`}
          iconBg={COLORS.amberLight}
          iconColor={COLORS.accent}
          chartColor={COLORS.accent}
        />
        <StatCard
          icon={XCircle}
          label="អវត្តមាន"
          value={counts.absent}
          sub={`${((counts.absent / total) * 100).toFixed(0)}% នៃចំនួនសរុប`}
          iconBg={COLORS.redLight}
          iconColor={COLORS.red}
          chartColor={COLORS.red}
        />
        <StatCard
          icon={Clock}
          label="ឈប់សម្រាក"
          value={counts.leave}
          sub={`${((counts.leave / total) * 100).toFixed(0)}% នៃចំនួនសរុប`}
          iconBg={COLORS.purpleLight}
          iconColor={COLORS.purple}
          chartColor={COLORS.purple}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខសម្គាល់..."
            className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-10 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
          />
        </div>
        <div className="relative">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 w-full sm:w-52"
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6] pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 w-full sm:w-44"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6] pointer-events-none" />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-right font-medium px-5 py-3">បុគ្គលិក</th>
              <th className="text-right font-medium px-5 py-3">សាខា / វេន</th>
              <th className="text-right font-medium px-5 py-3">ម៉ោងចូល</th>
              <th className="text-right font-medium px-5 py-3">ម៉ោងចេញ</th>
              <th className="text-right font-medium px-5 py-3">ម៉ោងធ្វើការ</th>
              <th className="text-right font-medium px-5 py-3">ស្ថានភាព</th>
              <th className="text-right font-medium px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((a) => {
              const st = attendanceStatusStyle[a.status];
              const StIcon = st.icon;
              return (
                <tr key={a.id} className="border-t border-[#EBEDF3] hover:bg-[#F7F8FB]/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                        {a.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-[#1E2333]">{a.name}</div>
                        <div className="text-xs text-[#B4B7C6]">{a.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">
                    <div>{a.branch}</div>
                    <div className="text-xs text-[#B4B7C6]">វេន{a.shift}</div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]" dir="ltr">
                    {a.checkIn}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]" dir="ltr">
                    {a.checkOut}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{a.hours}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1 inline-flex items-center gap-1.5"
                      style={{ background: st.bg, color: st.fg }}
                    >
                      <StIcon size={12} />
                      {a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-left">
                    <button onClick={() => editRecord(a)} aria-label={`កែវត្តមាន ${a.name}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] ml-auto">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[#8A8FA3] text-sm py-10">
                  រកមិនឃើញកំណត់ត្រាដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរក
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {paged.map((a) => {
          const st = attendanceStatusStyle[a.status];
          const StIcon = st.icon;
          return (
            <div key={a.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-sm font-bold flex items-center justify-center shrink-0">
                  {a.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1E2333] text-sm truncate">{a.name}</div>
                  <div className="text-xs text-[#8A8FA3] truncate">
                    {a.branch} · វេន{a.shift}
                  </div>
                </div>
                <span
                  className="text-[11px] font-medium rounded-full px-2.5 py-1 inline-flex items-center gap-1 shrink-0"
                  style={{ background: st.bg, color: st.fg }}
                >
                  <StIcon size={11} />
                  {a.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-[#8A8FA3] border-t border-[#EBEDF3] pt-3">
                <div>
                  <div className="text-[10px] mb-0.5">ចូល</div>
                  <div className="text-[#1E2333] font-medium" dir="ltr">
                    {a.checkIn}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] mb-0.5">ចេញ</div>
                  <div className="text-[#1E2333] font-medium" dir="ltr">
                    {a.checkOut}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] mb-0.5">សរុប</div>
                  <div className="text-[#1E2333] font-medium">{a.hours}</div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-[#8A8FA3] text-sm py-10 bg-white rounded-2xl border border-[#EBEDF3]">
            រកមិនឃើញកំណត់ត្រាដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរក
          </div>
        )}
      </div>
      <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />

      {/* Manual entry modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1E2333] text-lg">{editingRecord ? "កែតម្រូវវត្តមាន" : "កត់ត្រាវត្តមានដោយដៃ"}</h3>
              <button
                onClick={() => { setShowManual(false); setEditingRecord(null); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3.5">
              <div>
                <FieldLabel>ជ្រើសរើសបុគ្គលិក</FieldLabel>
                <SelectField options={employees.map((employee) => ({ label: `${employee.name} · ${employee.id}`, value: employee.id }))} value={manualForm.employeeId} onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>ម៉ោងចូល</FieldLabel>
                  <TextField type="time" value={manualForm.checkIn} onChange={(e) => setManualForm({ ...manualForm, checkIn: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>ម៉ោងចេញ</FieldLabel>
                  <TextField type="time" value={manualForm.checkOut} onChange={(e) => setManualForm({ ...manualForm, checkOut: e.target.value })} />
                </div>
              </div>
              <div>
                <FieldLabel>ស្ថានភាព</FieldLabel>
                <SelectField options={["មានវត្តមាន", "យឺត", "អវត្តមាន", "ច្បាប់"]} value={manualForm.status} onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowManual(false); setEditingRecord(null); }}
                className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm font-medium text-[#5B5F73]"
              >
                បោះបង់
              </button>
              <button
                onClick={saveManualEntry}
                disabled={!manualForm.employeeId}
                className="flex-1 text-white rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: COLORS.primary }}
              >
                រក្សាទុក
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
