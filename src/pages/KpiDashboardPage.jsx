import React, { useMemo, useState } from "react";
import { Plus, Target, TrendingUp, Trash2, X } from "lucide-react";
import StatCard from "../components/shared/StatCard";
import { COLORS } from "../data/theme";

const emptyKpi = (employees) => ({
  employeeId: employees[0]?.id || "", metric: "គុណភាពការងារ", target: "100", actual: "0", period: new Date().toISOString().slice(0, 7), note: "",
});

export default function KpiDashboardPage({ employees = [], kpis = [], setKpis }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyKpi(employees));
  const [error, setError] = useState("");
  const summary = useMemo(() => {
    const scored = kpis.map((k) => ({ ...k, score: Number(k.target) > 0 ? Math.min(100, Math.round((Number(k.actual) / Number(k.target)) * 100)) : 0 }));
    const average = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : 0;
    return { scored, average, achieved: scored.filter((item) => item.score >= 100).length, needsFollowUp: scored.filter((item) => item.score < 70).length };
  }, [kpis]);

  const save = async () => {
    if (!form.employeeId || !form.metric.trim() || Number(form.target) <= 0 || Number(form.actual) < 0) {
      setError("សូមជ្រើសបុគ្គលិក និងបំពេញ Target/Actual ឲ្យត្រឹមត្រូវ");
      return;
    }
    const employee = employees.find((item) => item.id === form.employeeId);
    await setKpis((list) => [{
      kpiId: `KPI-${Date.now()}`, employeeId: employee.id, employeeName: employee.name, branch: employee.branch,
      metric: form.metric.trim(), target: Number(form.target), actual: Number(form.actual), period: form.period, note: form.note.trim(), createdAt: new Date().toISOString(),
    }, ...list]);
    setForm(emptyKpi(employees)); setError(""); setShowForm(false);
  };

  const remove = (kpiId) => setKpis((list) => list.filter((item) => item.kpiId !== kpiId));

  return <>
    <div className="flex items-start justify-between mb-5 sm:mb-6 gap-3 flex-wrap">
      <div><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">KPI Dashboard</h1><p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">តាមដាន Target និងលទ្ធផលការងាររបស់បុគ្គលិក</p></div>
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#2A3F8F] text-white text-sm font-semibold rounded-xl px-4 py-2.5"><Plus size={16} />បន្ថែម KPI</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <StatCard icon={Target} label="KPI ទាំងអស់" value={summary.scored.length} sub="កំណត់ត្រាក្នុងប្រព័ន្ធ" iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary} />
      <StatCard icon={TrendingUp} label="ពិន្ទុមធ្យម" value={`${summary.average}%`} sub="Actual ÷ Target" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green} />
      <StatCard icon={Target} label="ត្រូវតាមដាន" value={summary.needsFollowUp} sub="ពិន្ទុក្រោម 70%" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent} />
    </div>
    <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs"><th className="text-right font-medium px-5 py-3">បុគ្គលិក</th><th className="text-right font-medium px-5 py-3">សូចនាករ</th><th className="text-right font-medium px-5 py-3">រយៈពេល</th><th className="text-right font-medium px-5 py-3">Target</th><th className="text-right font-medium px-5 py-3">Actual</th><th className="text-right font-medium px-5 py-3">ពិន្ទុ</th><th className="px-4 py-3" /></tr></thead>
        <tbody>{summary.scored.map((item) => <tr key={item.kpiId} className="border-t border-[#EBEDF3]"><td className="px-5 py-3.5"><div className="font-medium text-[#1E2333]">{item.employeeName}</div><div className="text-xs text-[#8A8FA3]">{item.branch}</div></td><td className="px-5 py-3.5 text-[#5B5F73]">{item.metric}</td><td className="px-5 py-3.5 text-[#5B5F73]">{item.period}</td><td className="px-5 py-3.5">{item.target}</td><td className="px-5 py-3.5">{item.actual}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.score >= 100 ? "bg-[#E9F7EF] text-[#3FA66B]" : item.score >= 70 ? "bg-[#EEF1FB] text-[#2A3F8F]" : "bg-[#FDF3E3] text-[#E8A33D]"}`}>{item.score}%</span></td><td className="px-4 py-3.5"><button onClick={() => remove(item.kpiId)} className="p-2 text-[#D9614F] hover:bg-[#FBEBE8] rounded-lg" aria-label="លុប KPI"><Trash2 size={16}/></button></td></tr>)}
        {!summary.scored.length && <tr><td colSpan="7" className="text-center py-12 text-[#8A8FA3]">មិនទាន់មាន KPI ទេ។ ចុច “បន្ថែម KPI” ដើម្បីចាប់ផ្ដើម។</td></tr>}</tbody></table></div>
    </div>
    {showForm && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-lg p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-[#1E2333]">បន្ថែម KPI</h2><button onClick={() => setShowForm(false)}><X size={20}/></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-xs text-[#5B5F73]">បុគ្គលិក<select value={form.employeeId} onChange={(e)=>setForm({...form,employeeId:e.target.value})} className="mt-1 w-full bg-[#F5F6FA] rounded-xl px-3 py-2.5 text-sm">{employees.map((e)=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><label className="text-xs text-[#5B5F73]">ខែ<input type="month" value={form.period} onChange={(e)=>setForm({...form,period:e.target.value})} className="mt-1 w-full bg-[#F5F6FA] rounded-xl px-3 py-2.5 text-sm"/></label><label className="text-xs text-[#5B5F73] sm:col-span-2">សូចនាករ<input value={form.metric} onChange={(e)=>setForm({...form,metric:e.target.value})} className="mt-1 w-full bg-[#F5F6FA] rounded-xl px-3 py-2.5 text-sm" placeholder="ឧ. ចំនួនអតិថិជនថ្មី"/></label><label className="text-xs text-[#5B5F73]">Target<input type="number" min="1" value={form.target} onChange={(e)=>setForm({...form,target:e.target.value})} className="mt-1 w-full bg-[#F5F6FA] rounded-xl px-3 py-2.5 text-sm"/></label><label className="text-xs text-[#5B5F73]">Actual<input type="number" min="0" value={form.actual} onChange={(e)=>setForm({...form,actual:e.target.value})} className="mt-1 w-full bg-[#F5F6FA] rounded-xl px-3 py-2.5 text-sm"/></label><label className="text-xs text-[#5B5F73] sm:col-span-2">កំណត់ចំណាំ<input value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})} className="mt-1 w-full bg-[#F5F6FA] rounded-xl px-3 py-2.5 text-sm"/></label></div>{error&&<p className="text-sm text-[#D9614F] mt-3">{error}</p>}<div className="flex gap-2 mt-5"><button onClick={()=>setShowForm(false)} className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm">បោះបង់</button><button onClick={save} className="flex-1 bg-[#2A3F8F] text-white rounded-xl py-2.5 text-sm font-semibold">រក្សាទុក</button></div></div></div>}
  </>;
}
