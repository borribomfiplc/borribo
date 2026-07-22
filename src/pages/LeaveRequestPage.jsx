import React, { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Download, FileText, Search, XCircle } from "lucide-react";
import { COLORS } from "../data/theme";
import { correctionStatusStyle, leaveTypeStyle } from "../data/mockData";
import StatCard from "../components/shared/StatCard";

export default function LeaveRequestPage({ requests = [] }) {
  const [statusFilter, setStatusFilter] = useState("ទាំងអស់");
  const [query, setQuery] = useState("");
  const statuses = ["ទាំងអស់", "រង់ចាំពិនិត្យ", "បានអនុម័ត", "បានបដិសេធ", "បានលុបចោល"];
  const filtered = useMemo(() => requests.filter((request) => {
    const term = query.trim().toLowerCase();
    return (statusFilter === "ទាំងអស់" || request.status === statusFilter) &&
      (!term || String(request.name || "").toLowerCase().includes(term) || String(request.employeeId || request.empId || "").toLowerCase().includes(term));
  }), [query, requests, statusFilter]);

  const exportCsv = () => {
    const rows = [["Request ID", "Employee ID", "Name", "Branch", "Leave type", "Start", "End", "Days", "Portion", "Status", "Reason", "Decision reason"], ...filtered.map((request) => [request.id, request.employeeId || request.empId, request.name, request.branch, request.leaveType, request.startDate, request.endDate, request.days, request.portion || "ពេញថ្ងៃ", request.status, request.reason, request.decisionReason || ""])];
    const csv = "\ufeff" + rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `leave-requests-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const counts = {
    pending: requests.filter((request) => request.status === "រង់ចាំពិនិត្យ").length,
    approved: requests.filter((request) => request.status === "បានអនុម័ត").length,
    rejected: requests.filter((request) => request.status === "បានបដិសេធ").length,
  };

  return <>
    <div className="flex items-start justify-between gap-3 mb-5 sm:mb-6 flex-wrap"><div><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">បញ្ជីសំណើសុំច្បាប់</h1><p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">សំណើត្រូវបានបង្កើតដោយបុគ្គលិក និងសម្រេចនៅ Menu អនុម័តច្បាប់</p></div><button onClick={exportCsv} className="flex items-center gap-2 bg-white border border-[#EBEDF3] rounded-xl px-4 py-2.5 text-sm text-[#2A3F8F]"><Download size={16} /> Export CSV</button></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5"><StatCard icon={AlertCircle} label="រង់ចាំពិនិត្យ" value={counts.pending} sub="ត្រូវការ HR/Admin សម្រេច" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent} /><StatCard icon={CheckCircle2} label="បានអនុម័ត" value={counts.approved} sub="បានភ្ជាប់ទៅវត្តមាន" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green} /><StatCard icon={XCircle} label="បានបដិសេធ" value={counts.rejected} sub="មានកំណត់មូលហេតុ" iconBg={COLORS.redLight} iconColor={COLORS.red} chartColor={COLORS.red} /></div>
    <div className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-4 mb-5 flex flex-wrap gap-3"><div className="relative"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm outline-none">{statuses.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8FA3] pointer-events-none" /></div><div className="relative flex-1 min-w-[190px]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ស្វែងរកឈ្មោះ ឬលេខបុគ្គលិក..." className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm outline-none" /><Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8FA3]" /></div></div>
    <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden"><div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs"><th className="text-right font-medium px-5 py-3">បុគ្គលិក</th><th className="text-right font-medium px-5 py-3">ប្រភេទ</th><th className="text-right font-medium px-5 py-3">រយៈពេល</th><th className="text-right font-medium px-5 py-3">ហេតុផល</th><th className="text-right font-medium px-5 py-3">ស្ថានភាព</th></tr></thead><tbody>{filtered.map((request) => { const status = correctionStatusStyle[request.status] || correctionStatusStyle["រង់ចាំពិនិត្យ"]; const type = leaveTypeStyle[request.leaveType] || { bg: COLORS.purpleLight, fg: COLORS.purple }; return <tr key={request.id} className="border-t border-[#EBEDF3] align-top"><td className="px-5 py-3.5"><div className="font-medium text-[#1E2333]">{request.name}</div><div className="text-xs text-[#8A8FA3]">{request.employeeId || request.empId} · {request.branch}</div></td><td className="px-5 py-3.5"><span className="text-xs rounded-full px-2.5 py-1" style={{ background: type.bg, color: type.fg }}>{request.leaveType}</span></td><td className="px-5 py-3.5 text-[#5B5F73] whitespace-nowrap">{request.startDate} — {request.endDate}<div className="text-xs text-[#8A8FA3]">{request.days} ថ្ងៃ · {request.portion || "ពេញថ្ងៃ"}</div></td><td className="px-5 py-3.5 text-xs text-[#5B5F73] max-w-xs"><div>{request.reason}</div>{request.decisionReason && <div className="mt-1 text-[#8A8FA3]">មតិ៖ {request.decisionReason}</div>}</td><td className="px-5 py-3.5"><span className="text-xs rounded-full px-2.5 py-1 whitespace-nowrap" style={{ background: status.bg, color: status.fg }}>{request.status}</span></td></tr>; })}{!filtered.length && <tr><td colSpan={5} className="text-center text-[#8A8FA3] py-10">មិនមានសំណើត្រូវនឹងលក្ខខណ្ឌនេះទេ</td></tr>}</tbody></table></div>
      <div className="md:hidden divide-y divide-[#EBEDF3]">{filtered.map((request) => { const status = correctionStatusStyle[request.status] || correctionStatusStyle["រង់ចាំពិនិត្យ"]; return <div key={request.id} className="p-4"><div className="flex justify-between gap-2"><div><div className="font-medium text-sm text-[#1E2333]">{request.name}</div><div className="text-xs text-[#8A8FA3]">{request.leaveType}</div></div><span className="h-fit text-[11px] rounded-full px-2.5 py-1" style={{ background: status.bg, color: status.fg }}>{request.status}</span></div><div className="text-xs text-[#5B5F73] mt-3">{request.startDate} — {request.endDate} · {request.days} ថ្ងៃ</div><div className="text-xs text-[#8A8FA3] mt-1">{request.reason}</div></div>; })}{!filtered.length && <div className="text-center text-[#8A8FA3] py-10">មិនមានសំណើទេ</div>}</div>
    </div>
  </>;
}
