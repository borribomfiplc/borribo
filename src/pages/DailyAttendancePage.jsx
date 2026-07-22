import React, { useMemo, useState } from "react";
import {
  Clock, Search, ChevronDown, X, Pencil, CheckCircle2, XCircle, AlertCircle, PlayCircle,
  Download, Smartphone, MonitorSmartphone, Fingerprint, UserRoundCheck, LogOut
} from "lucide-react";
import { COLORS } from "../data/theme";
import { attendanceStatusStyle } from "../data/mockData";
import { FieldLabel, TextField, SelectField } from "../components/shared/FormFields";
import { usePagination } from "../hooks/usePagination";
import PaginationBar from "../components/shared/PaginationBar";
import StatCard from "../components/shared/StatCard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { attendanceHistoryRecord, calculateAttendanceMetrics, DEFAULT_WORKING_HOURS, scheduleTextForRecord, todayISO } from "../utils/attendance";
import { approvedLeaveOnDate } from "../utils/leave";

const sourceMeta = {
  mobile: { label: "ទូរស័ព្ទ GPS/QR", icon: Smartphone, color: "#2A3F8F", bg: "#EEF1FB" },
  kiosk: { label: "Kiosk", icon: MonitorSmartphone, color: "#7B4DB1", bg: "#F2EAFB" },
  fingerprint: { label: "Fingerprint", icon: Fingerprint, color: "#137A62", bg: "#E9F7EF" },
  manual: { label: "ដោយដៃ", icon: UserRoundCheck, color: "#B97913", bg: "#FFF5E5" },
  correction: { label: "កែតម្រូវ", icon: Pencil, color: "#B97913", bg: "#FFF5E5" },
  leave: { label: "ច្បាប់អនុម័ត", icon: LogOut, color: "#8B5CF6", bg: "#F1EBFE" },
  unknown: { label: "មិនបានកំណត់", icon: Clock, color: "#6B7085", bg: "#F1F2F6" },
};

const sourceFor = (record) => sourceMeta[record.source] || sourceMeta.unknown;

export default function DailyAttendancePage({
  employees, attendanceToday, setAttendanceToday, attendanceHistory = [], setAttendanceHistory,
  leaveRequests = [],
}) {
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("ទាំងអស់");
  const [statusFilter, setStatusFilter] = useState("ទាំងអស់");
  const [sourceFilter, setSourceFilter] = useState("ទាំងអស់");
  const [showManual, setShowManual] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [manualForm, setManualForm] = useState({ employeeId: "", checkIn: "08:00", checkOut: "17:00", status: "មានវត្តមាន" });

  const dailyRows = useMemo(() => {
    const activeEmployees = employees.filter((employee) => employee.status !== "អសកម្ម");
    const recordsByEmployee = new Map(attendanceToday.map((record) => [record.id, record]));
    const roster = activeEmployees.map((employee) => {
      const existing = recordsByEmployee.get(employee.id);
      if (existing) return existing;
      const approvedLeave = approvedLeaveOnDate(leaveRequests, employee.id, todayISO());
      return {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      branch: employee.branch,
      shift: employee.shift,
      checkIn: "—",
      checkOut: "—",
      hours: "—",
      status: approvedLeave ? "ច្បាប់" : "អវត្តមាន",
      source: approvedLeave ? "leave" : "unknown",
      leaveRequestId: approvedLeave?.id || "",
      leaveType: approvedLeave?.leaveType || "",
      leavePortion: approvedLeave?.portion || "",
      dateISO: todayISO(),
      isPlaceholder: true,
      };
    });
    const employeeIds = new Set(activeEmployees.map((employee) => employee.id));
    return [...roster, ...attendanceToday.filter((record) => !employeeIds.has(record.id))];
  }, [attendanceToday, employees, leaveRequests]);

  const branches = ["ទាំងអស់", ...Array.from(new Set(dailyRows.map((a) => a.branch).filter(Boolean)))];
  const statuses = ["ទាំងអស់", "មានវត្តមាន", "យឺត", "អវត្តមាន", "ច្បាប់"];
  const sources = [
    { value: "ទាំងអស់", label: "ប្រភពទាំងអស់" },
    ...Object.entries(sourceMeta).map(([value, meta]) => ({ value, label: meta.label })),
  ];

  const filtered = dailyRows.filter((a) => {
    const matchesQuery = String(a.name || "").includes(query) || String(a.id || "").toLowerCase().includes(query.toLowerCase());
    const matchesBranch = branchFilter === "ទាំងអស់" || a.branch === branchFilter;
    const matchesStatus = statusFilter === "ទាំងអស់" || a.status === statusFilter;
    const matchesSource = sourceFilter === "ទាំងអស់" || (a.source || "unknown") === sourceFilter;
    return matchesQuery && matchesBranch && matchesStatus && matchesSource;
  });

  const { page, setPage, totalPages, totalItems, pageSize, pageItems: paged } = usePagination(filtered);

  const counts = {
    present: dailyRows.filter((a) => a.status === "មានវត្តមាន").length,
    late: dailyRows.filter((a) => a.status === "យឺត").length,
    earlyLeave: dailyRows.filter((a) => a.isEarlyLeave).length,
    absent: dailyRows.filter((a) => a.status === "អវត្តមាន").length,
    leave: dailyRows.filter((a) => a.status === "ច្បាប់").length,
  };
  const total = dailyRows.length || 1;
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

  const exportToday = () => {
    const rows = [
      ["Employee ID", "Name", "Role", "Branch", "Schedule", "Check-in", "Check-out", "Working hours", "Status", "Late minutes", "Early-leave minutes", "Source"],
      ...filtered.map((record) => [
        record.id, record.name, record.role, record.branch, scheduleTextForRecord(record), record.checkIn,
        record.checkOut, record.hours, record.status, record.lateMinutes || 0, record.earlyLeaveMinutes || 0,
        sourceFor(record).label,
      ]),
    ];
    const csv = "\ufeff" + rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${todayISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      source: "manual",
      manualEntry: true,
    };
    await setAttendanceToday((records) => {
      const exists = records.some((record) => record.id === employee.id);
      return exists
        ? records.map((record) => (record.id === employee.id ? { ...record, ...nextRecord } : record))
        : [nextRecord, ...records];
    });
    if (setAttendanceHistory) {
      const historyRecord = attendanceHistoryRecord(nextRecord);
      await setAttendanceHistory((records) => records.some((record) => record.docId === historyRecord.docId)
        ? records.map((record) => record.docId === historyRecord.docId ? { ...record, ...historyRecord } : record)
        : [historyRecord, ...records]);
    }
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
        <div className="flex items-center gap-2">
          <button onClick={exportToday} className="flex items-center gap-2 rounded-xl border border-[#EBEDF3] bg-white px-3.5 py-2 text-xs font-medium text-[#5B5F73] sm:px-4 sm:py-2.5 sm:text-sm">
            <Download size={16} /> នាំចេញ
          </button>
          <button
            onClick={openManualEntry}
            className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap"
            style={{ background: COLORS.primary }}
          >
            <PlayCircle size={16} />
            កត់ត្រាដោយដៃ
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-5">
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
          icon={LogOut}
          label="ចេញមុន"
          value={counts.earlyLeave}
          sub={`${((counts.earlyLeave / total) * 100).toFixed(0)}% នៃចំនួនសរុប`}
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
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-4 mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_180px_190px]">
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
        <div className="relative">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 w-full"
          >
            {sources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
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
              <th className="text-right font-medium px-5 py-3">សាខា / កាលវិភាគ</th>
              <th className="text-right font-medium px-5 py-3">ម៉ោងចូល</th>
              <th className="text-right font-medium px-5 py-3">ម៉ោងចេញ</th>
              <th className="text-right font-medium px-5 py-3">ម៉ោងធ្វើការ</th>
              <th className="text-right font-medium px-5 py-3">ប្រភព</th>
              <th className="text-right font-medium px-5 py-3">ស្ថានភាព</th>
              <th className="text-right font-medium px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((a) => {
              const st = attendanceStatusStyle[a.status];
              const StIcon = st.icon;
              const source = sourceFor(a);
              const SourceIcon = source.icon;
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
                    <div className="text-xs text-[#B4B7C6]" dir="ltr">{scheduleTextForRecord(a)}</div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]" dir="ltr">
                    {a.checkIn}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]" dir="ltr">
                    {a.checkOut}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{a.hours}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ color: source.color, background: source.bg }}>
                      <SourceIcon size={12} />{source.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1 inline-flex items-center gap-1.5"
                      style={{ background: st.bg, color: st.fg }}
                    >
                      <StIcon size={12} />
                      {a.status}
                    </span>
                    {(a.isLate || a.isEarlyLeave) && <div className="mt-1 text-[11px] text-[#B97913]">{a.isLate ? `យឺត ${a.lateMinutes} នាទី` : ""}{a.isLate && a.isEarlyLeave ? " · " : ""}{a.isEarlyLeave ? `ចេញមុន ${a.earlyLeaveMinutes} នាទី` : ""}</div>}
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
                <td colSpan={8} className="text-center text-[#8A8FA3] text-sm py-10">
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
          const source = sourceFor(a);
          const SourceIcon = source.icon;
          return (
            <div key={a.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-sm font-bold flex items-center justify-center shrink-0">
                  {a.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1E2333] text-sm truncate">{a.name}</div>
                  <div className="text-xs text-[#8A8FA3] truncate">
                    {a.branch} · <span dir="ltr">{scheduleTextForRecord(a)}</span>
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
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EBEDF3] pt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ color: source.color, background: source.bg }}><SourceIcon size={12} />{source.label}</span>
                {(a.isLate || a.isEarlyLeave) && <span className="text-[11px] text-[#B97913]">{a.isLate ? `យឺត ${a.lateMinutes} នាទី` : ""}{a.isLate && a.isEarlyLeave ? " · " : ""}{a.isEarlyLeave ? `ចេញមុន ${a.earlyLeaveMinutes} នាទី` : ""}</span>}
                <button onClick={() => editRecord(a)} className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F6FA] text-[#8A8FA3]" aria-label={`កែវត្តមាន ${a.name}`}><Pencil size={14} /></button>
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
