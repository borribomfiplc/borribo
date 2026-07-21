import React, { useMemo, useState } from "react";
import { Download, Fingerprint, Upload } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import StatCard from "../components/shared/StatCard";
import { COLORS } from "../data/theme";
import { db } from "../firebase/config";
import { calculateAttendanceMetrics, DEFAULT_WORKING_HOURS } from "../utils/attendance";

const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
const normaliseAction = (value) => /^(in|checkin|check-in|ចូល)$/i.test(String(value || "").trim()) ? "in" : "out";

export default function FingerprintPage({ employees = [], attendanceToday = [], setAttendanceToday, attendanceHistory = [], setAttendanceHistory }) {
  const [rows, setRows] = useState([]); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const valid = useMemo(() => rows.filter((row) => row.employee && row.date && row.time), [rows]);
  const downloadTemplate = () => {
    const csv = "employeeId,date,time,action\nEMP-001,2026-07-22,08:00,IN\nEMP-001,2026-07-22,17:30,OUT\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "fingerprint-import-template.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const chooseFile = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => {
      const lines = String(reader.result || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean); const [header, ...data] = lines;
      const fields = header.split(",").map((value) => value.trim().toLowerCase()); const idIndex = fields.indexOf("employeeid"); const dateIndex = fields.indexOf("date"); const timeIndex = fields.indexOf("time"); const actionIndex = fields.indexOf("action");
      if ([idIndex,dateIndex,timeIndex,actionIndex].some((i)=>i<0)) { setError("CSV ត្រូវមាន column: employeeId,date,time,action"); setRows([]); return; }
      const parsed = data.map((line, index) => { const cells = line.split(",").map((value)=>value.trim()); const employeeId=cells[idIndex]; return { line:index+2, employeeId, date:cells[dateIndex], time:cells[timeIndex], action:normaliseAction(cells[actionIndex]), employee:employees.find((e)=>e.id.toLowerCase()===employeeId.toLowerCase()) }; });
      setRows(parsed); setError(parsed.some((row)=>!row.employee||!row.date||!row.time) ? "មានជួរខ្លះមិនត្រឹមត្រូវ ឬមិនរកឃើញលេខសម្គាល់បុគ្គលិក" : ""); setMessage("");
    }; reader.readAsText(file);
  };
  const importRows = async () => {
    if (!valid.length) { setError("គ្មានទិន្នន័យត្រឹមត្រូវសម្រាប់នាំចូល"); return; }
    let workingHours = DEFAULT_WORKING_HOURS;
    try { const snap = await getDoc(doc(db, "settings", "workingHours")); if (snap.exists()) workingHours = snap.data(); } catch { /* Default schedule is used offline. */ }
    const byKey = new Map();
    [...attendanceHistory, ...attendanceToday].forEach((record) => byKey.set(`${record.id}-${record.dateISO}`, { ...record }));
    valid.forEach((row) => { const key=`${row.employee.id}-${row.date}`; const current=byKey.get(key) || { id:row.employee.id, uid:row.employee.uid||"", name:row.employee.name, role:row.employee.role, branch:row.employee.branch, shift:row.employee.shift === "ល្ងាច" ? "ល្ងាច" : "ព្រឹក", dateISO:row.date, status:"មានវត្តមាន", docId:key, recordId:key, source:"fingerprint" }; const time = row.time.slice(0,5); if(row.action==="in") { if(!current.checkIn || time<current.checkIn) { current.checkIn=time; current.checkInClientAt=`${row.date}T${time}:00+07:00`; } } else if(!current.checkOut || time>current.checkOut) { current.checkOut=time; current.checkOutClientAt=`${row.date}T${time}:00+07:00`; } const metrics=calculateAttendanceMetrics({shift:current.shift,workingHours,checkInAt:current.checkInClientAt,checkOutAt:current.checkOutClientAt}); Object.assign(current,metrics); byKey.set(key,current); });
    const all=Array.from(byKey.values()); const today=todayISO();
    await setAttendanceHistory(all);
    await setAttendanceToday(all.filter((record)=>record.dateISO===today));
    setMessage(`បាននាំចូល log Fingerprint ចំនួន ${valid.length} ជួរ រួចរាល់`); setRows([]); setError("");
  };
  return <>
    <div className="mb-5 sm:mb-6"><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">Fingerprint ម៉ាស៊ីន</h1><p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">នាំចូល log ពីម៉ាស៊ីន Fingerprint ទៅប្រវត្តិវត្តមាន</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"><StatCard icon={Fingerprint} label="Log ត្រៀមនាំចូល" value={valid.length} sub="ជួរត្រឹមត្រូវក្នុង CSV" iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary}/><StatCard icon={Fingerprint} label="បុគ្គលិកក្នុងប្រព័ន្ធ" value={employees.length} sub="សម្រាប់ផ្គូផ្គង Employee ID" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green}/><StatCard icon={Fingerprint} label="ប្រវត្តិវត្តមាន" value={attendanceHistory.length} sub="កំណត់ត្រារក្សាទុករួច" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent}/></div>
    <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5 mb-5"><h2 className="font-semibold text-[#1E2333] mb-2">នាំចូល CSV ពីម៉ាស៊ីន</h2><p className="text-sm text-[#5B5F73] mb-4">Export Attendance Log ពីម៉ាស៊ីនជា CSV រួចប្រើ column: <code className="bg-[#F5F6FA] px-1.5 py-0.5 rounded">employeeId,date,time,action</code>។ Action ប្រើ IN ឬ OUT។</p><div className="flex flex-wrap gap-3"><button onClick={downloadTemplate} className="flex items-center gap-2 border border-[#EBEDF3] rounded-xl px-4 py-2.5 text-sm font-medium text-[#2A3F8F]"><Download size={16}/>ទាញយក Template</button><label className="cursor-pointer flex items-center gap-2 bg-[#2A3F8F] text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Upload size={16}/>ជ្រើស CSV<input type="file" accept=".csv,text/csv" onChange={chooseFile} className="hidden"/></label>{valid.length>0&&<button onClick={importRows} className="bg-[#3FA66B] text-white rounded-xl px-4 py-2.5 text-sm font-semibold">នាំចូល {valid.length} ជួរ</button>}</div>{error&&<p className="text-sm text-[#D9614F] mt-3">{error}</p>}{message&&<p className="text-sm text-[#3FA66B] mt-3">{message}</p>}</div>
    {rows.length>0&&<div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden"><div className="px-5 py-4 font-semibold text-[#1E2333]">ពិនិត្យទិន្នន័យមុននាំចូល</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-[#F7F8FB] text-xs text-[#8A8FA3]"><th className="px-5 py-3 text-right">ជួរ</th><th className="px-5 py-3 text-right">Employee ID</th><th className="px-5 py-3 text-right">បុគ្គលិក</th><th className="px-5 py-3 text-right">កាលបរិច្ឆេទ/ម៉ោង</th><th className="px-5 py-3 text-right">សកម្មភាព</th></tr></thead><tbody>{rows.slice(0,20).map(row=><tr key={row.line} className={`border-t border-[#EBEDF3] ${!row.employee?"bg-[#FBEBE8]/40":""}`}><td className="px-5 py-3">{row.line}</td><td className="px-5 py-3">{row.employeeId}</td><td className="px-5 py-3">{row.employee?.name||"រកមិនឃើញ"}</td><td className="px-5 py-3">{row.date} {row.time}</td><td className="px-5 py-3">{row.action==="in"?"ចូល":"ចេញ"}</td></tr>)}</tbody></table></div>{rows.length>20&&<p className="px-5 py-3 text-xs text-[#8A8FA3]">បង្ហាញ 20 ជួរ ដំបូងពី {rows.length} ជួរ</p>}</div>}
  </>;
}
