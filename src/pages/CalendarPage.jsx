import React, { useMemo, useState } from "react";
import {
  CalendarDays, ChevronRight, ChevronLeft, CheckCircle2, Clock3, Cake,
  Building2, Filter, Plus, X, Pencil, Trash2, Users, AlertCircle,
} from "lucide-react";
import { dayLabelsKh, monthNamesKh } from "../data/mockData";
import { todayISO } from "../utils/attendance";
import { approvedLeaveOnDate, workingLeaveDates } from "../utils/leave";
import { isEmployeeInactive } from "../utils/employeeStatus";
import { newRecordId } from "../utils/id";

const ITEM_STYLE = {
  holiday: { label: "ថ្ងៃឈប់សម្រាក", color: "#E8A33D", bg: "#FDF3E3" },
  leave: { label: "ច្បាប់ឈប់សម្រាក", color: "#8B5CF6", bg: "#F1EBFE" },
  event: { label: "ព្រឹត្តិការណ៍", color: "#2A3F8F", bg: "#EEF1FB" },
  attendance: { label: "វត្តមាន", color: "#3FA66B", bg: "#E9F7EF" },
  birthday: { label: "ថ្ងៃកំណើត", color: "#D9618C", bg: "#FCEBF3" },
};

const EVENT_TYPES = ["ប្រជុំ", "បណ្តុះបណ្តាល", "សកម្មភាពក្រុមហ៊ុន", "កាលកំណត់", "ផ្សេងៗ"];
const FILTER_TYPES = [
  ["all", "ទាំងអស់"], ["holiday", "ថ្ងៃឈប់សម្រាក"], ["leave", "ច្បាប់ឈប់សម្រាក"],
  ["event", "ព្រឹត្តិការណ៍"], ["attendance", "វត្តមាន"], ["birthday", "ថ្ងៃកំណើត"],
];

function isoFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromISO(value) {
  return new Date(`${value}T00:00:00`);
}

function eachDate(start, end, callback) {
  if (!start || !end || start > end) return;
  const cursor = dateFromISO(start);
  const finish = dateFromISO(end);
  while (cursor <= finish) {
    callback(isoFromDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
}

function khmerDate(value) {
  if (!value) return "—";
  const date = dateFromISO(value);
  return `${date.getDate()} ${monthNamesKh[date.getMonth()]} ${date.getFullYear()}`;
}

function employeeForRecord(record, employees) {
  return employees.find((employee) => employee.id === (record.employeeId || record.id))
    || employees.find((employee) => employee.name === record.name);
}

function matchesScope(record, branch, department, employees) {
  const employee = employeeForRecord(record, employees);
  const recordBranch = record.branch || employee?.branch || "";
  const recordDepartment = record.department || record.dept || employee?.dept || "";
  return (!branch || recordBranch === branch) && (!department || recordDepartment === department);
}

const EMPTY_FORM = {
  title: "", type: "ប្រជុំ", startDate: todayISO(), endDate: todayISO(), branch: "", department: "", notes: "",
};

function EventModal({ event, branches, departments, onClose, onSave }) {
  const [form, setForm] = useState(event ? {
    title: event.title || "", type: event.eventType || "ប្រជុំ", startDate: event.startDate || event.dateISO || todayISO(),
    endDate: event.endDate || event.endDateISO || event.startDate || event.dateISO || todayISO(), branch: event.branch || "",
    department: event.department || "", notes: event.notes || "",
  } : EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("សូមបញ្ចូលឈ្មោះព្រឹត្តិការណ៍");
    if (!form.startDate || !form.endDate) return setError("សូមជ្រើសថ្ងៃចាប់ផ្ដើម និងថ្ងៃបញ្ចប់");
    if (form.endDate < form.startDate) return setError("ថ្ងៃបញ្ចប់មិនអាចមុនថ្ងៃចាប់ផ្ដើមទេ");
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, title: form.title.trim(), notes: form.notes.trim() });
      onClose();
    } catch (err) {
      setError(err?.message || "រក្សាទុកមិនបាន សូមព្យាយាមម្ដងទៀត");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101322]/45 p-3 sm:p-6 flex items-center justify-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EBEDF3] bg-white px-4 sm:px-5 py-4">
          <div>
            <h2 className="font-bold text-[#1E2333]">{event ? "កែព្រឹត្តិការណ៍" : "បន្ថែមព្រឹត្តិការណ៍"}</h2>
            <p className="text-xs text-[#8A8FA3] mt-0.5">សម្រាប់ប្រតិទិនអង្គភាព</p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-[#F5F6FA] flex items-center justify-center text-[#8A8FA3]"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2 text-xs font-medium text-[#5B5F73]">ឈ្មោះព្រឹត្តិការណ៍ *
            <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ឧ. កិច្ចប្រជុំប្រចាំខែ" className="mt-1.5 w-full rounded-xl border border-[#E4E7EF] px-3.5 py-2.5 text-sm outline-none focus:border-[#2A3F8F]" />
          </label>
          <label className="text-xs font-medium text-[#5B5F73]">ប្រភេទ
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#E4E7EF] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#2A3F8F]">{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
          </label>
          <label className="text-xs font-medium text-[#5B5F73]">សាខា
            <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#E4E7EF] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#2A3F8F]"><option value="">គ្រប់សាខា</option>{branches.filter((item) => item.status !== "អសកម្ម").map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
          </label>
          <label className="text-xs font-medium text-[#5B5F73]">ថ្ងៃចាប់ផ្ដើម *
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate })} className="mt-1.5 w-full rounded-xl border border-[#E4E7EF] px-3.5 py-2.5 text-sm outline-none focus:border-[#2A3F8F]" />
          </label>
          <label className="text-xs font-medium text-[#5B5F73]">ថ្ងៃបញ្ចប់ *
            <input type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#E4E7EF] px-3.5 py-2.5 text-sm outline-none focus:border-[#2A3F8F]" />
          </label>
          <label className="sm:col-span-2 text-xs font-medium text-[#5B5F73]">នាយកដ្ឋាន
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#E4E7EF] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#2A3F8F]"><option value="">គ្រប់នាយកដ្ឋាន</option>{departments.filter((item) => item.status !== "អសកម្ម").map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
          </label>
          <label className="sm:col-span-2 text-xs font-medium text-[#5B5F73]">សេចក្ដីសម្គាល់
            <textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ទីតាំង ឬព័ត៌មានបន្ថែម..." className="mt-1.5 w-full resize-none rounded-xl border border-[#E4E7EF] px-3.5 py-2.5 text-sm outline-none focus:border-[#2A3F8F]" />
          </label>
          {error && <div className="sm:col-span-2 rounded-xl bg-[#FBEBE8] px-3.5 py-2.5 text-sm text-[#B94736] flex gap-2"><AlertCircle size={17} className="shrink-0 mt-0.5" />{error}</div>}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#EBEDF3] bg-white px-4 sm:px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#E4E7EF] px-4 py-2.5 text-sm font-medium text-[#5B5F73]">បោះបង់</button>
          <button disabled={saving} className="rounded-xl bg-[#2A3F8F] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}</button>
        </div>
      </form>
    </div>
  );
}

export default function CalendarPage({
  leaveRequests = [], holidays = [], calendarEvents = [], setCalendarEvents,
  attendanceToday = [], attendanceHistory = [], employees = [], branches = [], departments = [], profile,
}) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [pageError, setPageError] = useState("");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthStart = `${monthPrefix}-01`;
  const monthEnd = `${monthPrefix}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")}`;

  const attendanceRows = useMemo(() => {
    const byKey = new Map();
    attendanceHistory.forEach((row) => byKey.set(`${row.id}_${row.dateISO}`, row));
    attendanceToday.forEach((row) => byKey.set(`${row.id}_${row.dateISO}`, row));
    const currentDate = todayISO();
    employees.filter((employee) => !isEmployeeInactive(employee.status)).forEach((employee) => {
      const key = `${employee.id}_${currentDate}`;
      if (byKey.has(key)) return;
      const approvedLeave = approvedLeaveOnDate(leaveRequests, employee.id, currentDate, holidays);
      const halfDay = approvedLeave?.portion && approvedLeave.portion !== "ពេញថ្ងៃ";
      byKey.set(key, {
        id: employee.id, name: employee.name, branch: employee.branch, dept: employee.dept,
        dateISO: currentDate, status: approvedLeave ? (halfDay ? "ច្បាប់កន្លះថ្ងៃ" : "ច្បាប់") : "អវត្តមាន",
        source: approvedLeave ? "leave" : "calendar-roster", leavePortion: approvedLeave?.portion || "",
      });
    });
    return [...byKey.values()];
  }, [attendanceHistory, attendanceToday, employees, holidays, leaveRequests]);

  const itemsByDate = useMemo(() => {
    const result = {};
    const add = (date, item) => {
      if (!result[date]) result[date] = [];
      result[date].push(item);
    };

    holidays.forEach((holiday) => {
      if (holiday.dateISO && (!branch || !holiday.branch || holiday.branch === branch)) {
        add(holiday.dateISO, { ...holiday, itemType: "holiday", title: holiday.name, startDate: holiday.dateISO, endDate: holiday.dateISO });
      }
    });

    leaveRequests.filter((request) => request.status === "បានអនុម័ត" && matchesScope(request, branch, department, employees)).forEach((request) => {
      workingLeaveDates(request.startDate, request.endDate, holidays).forEach((date) => add(date, {
        ...request, itemType: "leave", title: `${request.name} · ${request.leaveType}`,
      }));
    });

    calendarEvents.filter((event) => matchesScope(event, branch, department, employees)).forEach((event) => {
      const start = event.startDate || event.dateISO;
      const end = event.endDate || event.endDateISO || start;
      eachDate(start, end, (date) => add(date, { ...event, itemType: "event", title: event.title || event.name, startDate: start, endDate: end }));
    });

    employees.filter((employee) => !isEmployeeInactive(employee.status) && matchesScope(employee, branch, department, employees) && employee.dob).forEach((employee) => {
      const birthday = `${year}-${String(employee.dob).slice(5, 10)}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) add(birthday, { ...employee, id: `birthday-${employee.id}-${year}`, itemType: "birthday", title: `ថ្ងៃកំណើត ${employee.name}` });
    });

    const attendanceByDate = {};
    attendanceRows.filter((row) => matchesScope(row, branch, department, employees)).forEach((row) => {
      if (!row.dateISO) return;
      if (!attendanceByDate[row.dateISO]) attendanceByDate[row.dateISO] = [];
      attendanceByDate[row.dateISO].push(row);
    });
    Object.entries(attendanceByDate).forEach(([date, rows]) => {
      const present = rows.filter((row) => row.status === "មានវត្តមាន" || row.status === "យឺត").length;
      const late = rows.filter((row) => row.status === "យឺត").length;
      const absent = rows.filter((row) => row.status === "អវត្តមាន").length;
      const leave = rows.filter((row) => row.status === "ច្បាប់" || row.status === "ច្បាប់កន្លះថ្ងៃ").length;
      add(date, { id: `attendance-${date}`, itemType: "attendance", title: `វត្តមាន ${present} · យឺត ${late} · អវត្តមាន ${absent}`, present, late, absent, leave, rows });
    });
    return result;
  }, [attendanceRows, branch, calendarEvents, department, employees, holidays, leaveRequests, year]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const leading = first.getDay();
    const start = new Date(year, month, 1 - leading);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, iso: isoFromDate(date), currentMonth: date.getMonth() === month };
    });
  }, [month, year]);

  const visibleItems = (itemsByDate[selectedDate] || []).filter((item) => filterType === "all" || item.itemType === filterType);
  const monthItems = Object.entries(itemsByDate).filter(([date]) => date >= monthStart && date <= monthEnd).flatMap(([, items]) => items);
  const stats = {
    holidays: new Set(monthItems.filter((item) => item.itemType === "holiday").map((item) => item.id)).size,
    events: new Set(monthItems.filter((item) => item.itemType === "event").map((item) => item.id)).size,
    leaves: new Set(monthItems.filter((item) => item.itemType === "leave").map((item) => item.id)).size,
    birthdays: new Set(monthItems.filter((item) => item.itemType === "birthday").map((item) => item.id)).size,
  };

  const changeMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setViewDate(next);
    setSelectedDate(isoFromDate(next));
  };
  const goToday = () => {
    const date = new Date();
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDate(todayISO());
  };

  const saveEvent = async (form) => {
    setPageError("");
    const record = {
      ...(editingEvent || {}), id: editingEvent?.id || newRecordId("EVT"), title: form.title, eventType: form.type,
      startDate: form.startDate, endDate: form.endDate, branch: form.branch, department: form.department,
      notes: form.notes, createdAt: editingEvent?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      createdBy: editingEvent?.createdBy || profile?.name || profile?.email || "HR/Admin",
    };
    await setCalendarEvents((list) => editingEvent ? list.map((item) => item.id === editingEvent.id ? record : item) : [record, ...list]);
  };

  const deleteEvent = async (event) => {
    if (!window.confirm(`លុបព្រឹត្តិការណ៍ “${event.title}” មែនទេ?`)) return;
    setPageError("");
    try {
      await setCalendarEvents((list) => list.filter((item) => item.id !== event.id));
    } catch (err) {
      setPageError(err?.message || "លុបមិនបាន សូមព្យាយាមម្ដងទៀត");
    }
  };

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ប្រតិទិនអង្គភាព</h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">វត្តមាន ច្បាប់ឈប់សម្រាក ថ្ងៃឈប់សាធារណៈ និងព្រឹត្តិការណ៍</p>
        </div>
        <div className="flex gap-2">
          <button onClick={goToday} className="text-xs sm:text-sm font-medium text-[#2A3F8F] border border-[#DDE2F0] bg-white rounded-xl px-3.5 py-2.5">ថ្ងៃនេះ</button>
          <button onClick={() => { setEditingEvent(null); setShowEventModal(true); }} className="text-xs sm:text-sm font-semibold text-white bg-[#2A3F8F] rounded-xl px-3.5 py-2.5 flex items-center gap-1.5"><Plus size={16} /> បន្ថែមព្រឹត្តិការណ៍</button>
        </div>
      </div>

      {pageError && <div className="mb-4 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#B44335] flex items-start gap-2"><AlertCircle size={17} className="mt-0.5 shrink-0" />{pageError}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          [CalendarDays, "ថ្ងៃឈប់សម្រាក", stats.holidays, "#E8A33D", "#FDF3E3"],
          [Building2, "ព្រឹត្តិការណ៍", stats.events, "#2A3F8F", "#EEF1FB"],
          [Users, "បុគ្គលិកសុំច្បាប់", stats.leaves, "#8B5CF6", "#F1EBFE"],
          [Cake, "ថ្ងៃកំណើត", stats.birthdays, "#D9618C", "#FCEBF3"],
        ].map(([Icon, label, value, color, bg]) => <div key={label} className="rounded-2xl border border-[#EBEDF3] bg-white p-3.5 sm:p-4 flex items-center gap-3"><div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color, background: bg }}><Icon size={18} /></div><div><div className="text-lg font-bold text-[#1E2333] leading-none">{value}</div><div className="text-[11px] sm:text-xs text-[#8A8FA3] mt-1.5">{label}</div></div></div>)}
      </div>

      <div className="rounded-2xl border border-[#EBEDF3] bg-white p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[#5B5F73]"><Filter size={15} /> ចម្រាញ់ទិន្នន័យ</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-xl border border-[#E4E7EF] bg-white px-3 py-2.5 text-sm text-[#5B5F73] outline-none"><option value="">គ្រប់សាខា</option>{branches.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-xl border border-[#E4E7EF] bg-white px-3 py-2.5 text-sm text-[#5B5F73] outline-none"><option value="">គ្រប់នាយកដ្ឋាន</option>{departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-xl border border-[#E4E7EF] bg-white px-3 py-2.5 text-sm text-[#5B5F73] outline-none">{FILTER_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <section className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} aria-label="ខែមុន" className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]"><ChevronLeft size={18} /></button>
            <h2 className="font-bold text-[#1E2333] text-[15px] sm:text-base">{monthNamesKh[month]} {year}</h2>
            <button onClick={() => changeMonth(1)} aria-label="ខែបន្ទាប់" className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]"><ChevronRight size={18} /></button>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">{dayLabelsKh.map((day, index) => <div key={`${day}-${index}`} className={`text-center text-[11px] font-semibold py-1.5 ${index === 0 || index === 6 ? "text-[#D9614F]" : "text-[#8A8FA3]"}`}>{day}</div>)}</div>
              <div className="grid grid-cols-7 gap-1.5">
                {cells.map(({ date, iso, currentMonth }) => {
                  const rawItems = itemsByDate[iso] || [];
                  const dayItems = rawItems.filter((item) => filterType === "all" || item.itemType === filterType);
                  const isToday = iso === todayISO();
                  const isSelected = iso === selectedDate;
                  return <button key={iso} onClick={() => setSelectedDate(iso)} className={`min-h-[104px] rounded-xl border p-2 text-left align-top transition ${isSelected ? "border-[#2A3F8F] ring-2 ring-[#2A3F8F]/10" : "border-[#EBEDF3] hover:border-[#C9D3F2]"} ${currentMonth ? "bg-white" : "bg-[#FAFAFC]"}`}>
                    <div className="flex justify-between items-center"><span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${isToday ? "bg-[#2A3F8F] text-white" : currentMonth ? "text-[#3D4254]" : "text-[#B4B7C6]"}`}>{date.getDate()}</span>{dayItems.length > 3 && <span className="text-[10px] text-[#8A8FA3]">+{dayItems.length - 3}</span>}</div>
                    <div className="mt-1.5 space-y-1">{dayItems.slice(0, 3).map((item, index) => <div key={`${item.itemType}-${item.id || item.title}-${index}`} className="truncate rounded px-1.5 py-1 text-[10px] font-medium" style={{ color: ITEM_STYLE[item.itemType].color, background: ITEM_STYLE[item.itemType].bg }}>{item.title}</div>)}</div>
                  </button>;
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-[#EBEDF3] text-[11px] text-[#6B7085]">{Object.entries(ITEM_STYLE).map(([key, style]) => <span key={key} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: style.color }} />{style.label}</span>)}</div>
        </section>

        <aside className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 xl:max-h-[720px] xl:overflow-y-auto">
          <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="font-bold text-[#1E2333]">{khmerDate(selectedDate)}</h3><p className="text-xs text-[#8A8FA3] mt-1">សរុប {visibleItems.length} កំណត់ត្រា</p></div><CalendarDays size={20} className="text-[#2A3F8F]" /></div>
          <div className="space-y-3">
            {visibleItems.length === 0 && <div className="rounded-2xl bg-[#F7F8FB] px-4 py-8 text-center"><CalendarDays size={28} className="mx-auto text-[#C2C6D4]" /><p className="text-sm text-[#8A8FA3] mt-2">មិនមានកំណត់ត្រាសម្រាប់ថ្ងៃនេះទេ</p></div>}
            {visibleItems.map((item, index) => {
              const style = ITEM_STYLE[item.itemType];
              const Icon = item.itemType === "holiday" ? CalendarDays : item.itemType === "leave" ? CheckCircle2 : item.itemType === "attendance" ? Clock3 : item.itemType === "birthday" ? Cake : Building2;
              return <div key={`${item.itemType}-${item.id || index}`} className="rounded-xl border border-[#EBEDF3] p-3.5">
                <div className="flex items-start gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ color: style.color, background: style.bg }}><Icon size={17} /></div><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-[#1E2333] leading-snug">{item.title}</div><div className="text-[11px] mt-1" style={{ color: style.color }}>{item.itemType === "event" ? item.eventType : style.label}</div></div>{item.itemType === "event" && <div className="flex shrink-0"><button onClick={() => { setEditingEvent(item); setShowEventModal(true); }} className="w-8 h-8 rounded-lg text-[#8A8FA3] hover:bg-[#EEF1FB] hover:text-[#2A3F8F] flex items-center justify-center"><Pencil size={14} /></button><button onClick={() => deleteEvent(item)} className="w-8 h-8 rounded-lg text-[#8A8FA3] hover:bg-[#FBEBE8] hover:text-[#D9614F] flex items-center justify-center"><Trash2 size={14} /></button></div>}</div>
                {item.itemType === "attendance" && <div className="grid grid-cols-4 gap-1.5 mt-3 text-center"><div className="rounded-lg bg-[#E9F7EF] px-1 py-2"><b className="block text-sm text-[#3FA66B]">{item.present}</b><span className="text-[9px] text-[#6B7085]">មានវត្តមាន</span></div><div className="rounded-lg bg-[#FDF3E3] px-1 py-2"><b className="block text-sm text-[#E8A33D]">{item.late}</b><span className="text-[9px] text-[#6B7085]">យឺត</span></div><div className="rounded-lg bg-[#FBEBE8] px-1 py-2"><b className="block text-sm text-[#D9614F]">{item.absent}</b><span className="text-[9px] text-[#6B7085]">អវត្តមាន</span></div><div className="rounded-lg bg-[#F1EBFE] px-1 py-2"><b className="block text-sm text-[#8B5CF6]">{item.leave}</b><span className="text-[9px] text-[#6B7085]">ច្បាប់</span></div></div>}
                {item.itemType === "event" && <div className="mt-2 text-xs text-[#6B7085] space-y-1">{(item.startDate !== item.endDate) && <div>{khmerDate(item.startDate)} – {khmerDate(item.endDate)}</div>}{item.branch && <div>សាខា៖ {item.branch}</div>}{item.department && <div>នាយកដ្ឋាន៖ {item.department}</div>}{item.notes && <p className="pt-1 leading-relaxed">{item.notes}</p>}</div>}
                {item.itemType === "leave" && <div className="mt-2 text-xs text-[#6B7085]">{item.startDate} – {item.endDate} · {item.days} ថ្ងៃ · {item.portion || "ពេញថ្ងៃ"}{item.branch ? ` · ${item.branch}` : ""}<div className="mt-1 text-[11px] text-[#8B5CF6]">លេខសំណើ៖ {item.id}</div></div>}
                {item.itemType === "birthday" && <div className="mt-2 text-xs text-[#6B7085]">{item.role || "បុគ្គលិក"}{item.branch ? ` · ${item.branch}` : ""}</div>}
              </div>;
            })}
          </div>
        </aside>
      </div>

      {showEventModal && <EventModal event={editingEvent} branches={branches} departments={departments} onClose={() => { setShowEventModal(false); setEditingEvent(null); }} onSave={saveEvent} />}
    </>
  );
}
