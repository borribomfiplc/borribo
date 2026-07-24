import React, { useMemo, useState } from "react";
import { Download, Fingerprint, Loader2, Upload } from "lucide-react";
import StatCard from "../components/shared/StatCard";
import { COLORS } from "../data/theme";
import { importFingerprintAttendance } from "../services/attendance";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell.trim()); cell = ""; }
    else if (char === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else if (char !== "\r") cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((item) => item.some(Boolean));
}

function normalizeAction(value) {
  const action = String(value || "").trim().toLowerCase();
  if (["in", "checkin", "check-in", "ចូល"].includes(action)) return "in";
  if (["out", "checkout", "check-out", "ចេញ"].includes(action)) return "out";
  return "";
}

function validCalendarDate(value) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default function FingerprintPage({ employees = [], attendanceHistory = [] }) {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const employeeMap = useMemo(() => new Map(employees.map((employee) => [String(employee.id || "").toLowerCase(), employee])), [employees]);
  const valid = useMemo(() => rows.filter((row) => row.valid), [rows]);

  const downloadTemplate = () => {
    const csv = "employeeId,date,time,action\nEMP-001,2026-07-22,08:00,IN\nEMP-001,2026-07-22,17:30,OUT\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "fingerprint-import-template.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsedCsv = parseCsv(reader.result);
      const [header = [], ...data] = parsedCsv;
      const fields = header.map((value) => value.trim().toLowerCase());
      const indexes = {
        employeeId: fields.indexOf("employeeid"), date: fields.indexOf("date"),
        time: fields.indexOf("time"), action: fields.indexOf("action"),
      };
      if (Object.values(indexes).some((index) => index < 0)) {
        setError("CSV ត្រូវមាន column: employeeId,date,time,action"); setRows([]); return;
      }
      const parsed = data.map((cells, index) => {
        const employeeId = String(cells[indexes.employeeId] || "").trim();
        const date = String(cells[indexes.date] || "").trim();
        const time = String(cells[indexes.time] || "").trim();
        const action = normalizeAction(cells[indexes.action]);
        const employee = employeeMap.get(employeeId.toLowerCase());
        const issues = [];
        if (!employee) issues.push("រកមិនឃើញបុគ្គលិក");
        if (!validCalendarDate(date)) issues.push("ថ្ងៃមិនត្រឹមត្រូវ");
        if (!TIME_RE.test(time)) issues.push("ម៉ោងមិនត្រឹមត្រូវ");
        if (!action) issues.push("Action ត្រូវជា IN ឬ OUT");
        return { line: index + 2, employeeId, date, time, action, employee, valid: issues.length === 0, issues };
      });
      setRows(parsed); setMessage("");
      setError(parsed.some((row) => !row.valid) ? "មានជួរមិនត្រឹមត្រូវ។ ប្រព័ន្ធនឹងនាំចូលតែជួរដែលត្រឹមត្រូវ។" : "");
    };
    reader.onerror = () => setError("មិនអាចអានឯកសារ CSV បានទេ");
    reader.readAsText(file);
  };

  const importRows = async () => {
    if (!valid.length) { setError("គ្មានទិន្នន័យត្រឹមត្រូវសម្រាប់នាំចូល"); return; }
    setImporting(true); setError(""); setMessage("");
    try {
      const result = await importFingerprintAttendance(valid.map((row) => ({ employeeId: row.employee.id, date: row.date, time: row.time, action: row.action })));
      setMessage(`បាននាំចូល ${result.imported ?? valid.length} ជួរ និងរក្សាទុកដោយសុវត្ថិភាពរួចរាល់`);
      setRows([]);
    } catch (importError) {
      setError(importError.message || "មិនអាចនាំចូល Fingerprint បានទេ");
    } finally { setImporting(false); }
  };

  return <>
    <div className="mb-5 sm:mb-6"><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">Fingerprint ម៉ាស៊ីន</h1><p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">នាំចូល log ពីម៉ាស៊ីន Fingerprint ទៅប្រវត្តិវត្តមាន</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"><StatCard icon={Fingerprint} label="Log ត្រៀមនាំចូល" value={valid.length} sub="ជួរត្រឹមត្រូវក្នុង CSV" iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary}/><StatCard icon={Fingerprint} label="បុគ្គលិកក្នុងប្រព័ន្ធ" value={employees.length} sub="សម្រាប់ផ្គូផ្គង Employee ID" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green}/><StatCard icon={Fingerprint} label="ប្រវត្តិវត្តមាន" value={attendanceHistory.length} sub="កំណត់ត្រារក្សាទុករួច" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent}/></div>
    <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5 mb-5"><h2 className="font-semibold text-[#1E2333] mb-2">នាំចូល CSV ពីម៉ាស៊ីន</h2><p className="text-sm text-[#5B5F73] mb-4">CSV អាចមាន field ដាក់ក្នុង quotes និង comma។ Column ត្រូវជា <code className="bg-[#F5F6FA] px-1.5 py-0.5 rounded">employeeId,date,time,action</code> ហើយ Action ត្រូវជា IN ឬ OUT។</p><div className="flex flex-wrap gap-3"><button onClick={downloadTemplate} className="flex items-center gap-2 border border-[#EBEDF3] rounded-xl px-4 py-2.5 text-sm font-medium text-[#2A3F8F]"><Download size={16}/>ទាញយក Template</button><label className="cursor-pointer flex items-center gap-2 bg-[#2A3F8F] text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Upload size={16}/>ជ្រើស CSV<input type="file" accept=".csv,text/csv" onChange={chooseFile} className="hidden"/></label>{valid.length>0&&<button disabled={importing} onClick={importRows} className="bg-[#3FA66B] text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center gap-2">{importing&&<Loader2 size={16} className="animate-spin"/>}នាំចូល {valid.length} ជួរ</button>}</div>{error&&<p className="text-sm text-[#D9614F] mt-3">{error}</p>}{message&&<p className="text-sm text-[#3FA66B] mt-3">{message}</p>}</div>
    {rows.length>0&&<div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden"><div className="px-4 sm:px-5 py-4 font-semibold text-[#1E2333]">ពិនិត្យទិន្នន័យមុននាំចូល</div><div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-[#F7F8FB] text-xs text-[#8A8FA3]"><th className="px-5 py-3">ជួរ</th><th className="px-5 py-3">Employee ID</th><th className="px-5 py-3">បុគ្គលិក</th><th className="px-5 py-3">កាលបរិច្ឆេទ/ម៉ោង</th><th className="px-5 py-3">សកម្មភាព/បញ្ហា</th></tr></thead><tbody>{rows.slice(0,50).map(row=><tr key={row.line} className={`border-t border-[#EBEDF3] ${!row.valid?"bg-[#FBEBE8]/40":""}`}><td className="px-5 py-3">{row.line}</td><td className="px-5 py-3">{row.employeeId}</td><td className="px-5 py-3">{row.employee?.name||"រកមិនឃើញ"}</td><td className="px-5 py-3">{row.date} {row.time}</td><td className="px-5 py-3">{row.valid?(row.action==="in"?"ចូល":"ចេញ"):row.issues.join(" · ")}</td></tr>)}</tbody></table></div><div className="divide-y divide-[#EBEDF3] md:hidden">{rows.slice(0,50).map(row=><article key={row.line} className={`p-4 ${!row.valid?"bg-[#FBEBE8]/40":""}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-semibold text-sm text-[#1E2333]">{row.employee?.name||"រកមិនឃើញបុគ្គលិក"}</div><div className="mt-0.5 text-xs text-[#8A8FA3]" dir="ltr">{row.employeeId}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${row.valid?(row.action==="in"?"bg-[#E9F7EF] text-[#257C4B]":"bg-[#EEF1FB] text-[#2A3F8F]"):"bg-[#FBEBE8] text-[#D9614F]"}`}>{row.valid?(row.action==="in"?"ចូល":"ចេញ"):"មិនត្រឹមត្រូវ"}</span></div><div className="mt-3 rounded-xl bg-[#F7F8FB] px-3 py-2.5 text-xs"><div className="flex justify-between"><span className="text-[#8A8FA3]">ជួរ {row.line}</span><span className="font-medium text-[#5B5F73]" dir="ltr">{row.date} {row.time}</span></div>{!row.valid&&<div className="text-[#D9614F] mt-2">{row.issues.join(" · ")}</div>}</div></article>)}</div>{rows.length>50&&<p className="px-4 sm:px-5 py-3 text-xs text-[#8A8FA3]">បង្ហាញ 50 ជួរ ដំបូងពី {rows.length} ជួរ</p>}</div>}
  </>;
}
