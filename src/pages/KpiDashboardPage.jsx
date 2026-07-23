import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, ChevronDown, ChevronUp, History, Loader2,
  Pencil, Plus, RotateCcw, Send, Target, TrendingUp, X,
} from "lucide-react";
import StatCard from "../components/shared/StatCard";
import { COLORS } from "../data/theme";
import { createKpi, reviewKpi, submitKpi, updateKpi } from "../services/operations";

const emptyKpi = (employees = []) => ({
  employeeId: employees[0]?.id || "", metric: "គុណភាពការងារ", target: "100",
  actual: "0", weight: "100", period: new Date().toISOString().slice(0, 7),
  cycle: "monthly", status: "ព្រាង", note: "",
});
const cycleLabels = { monthly: "ប្រចាំខែ", quarterly: "ប្រចាំត្រីមាស", yearly: "ប្រចាំឆ្នាំ" };

function normalizedStatus(kpi) { return kpi.status || "ព្រាង"; }
function scoreOf(kpi) { return Number(kpi.target) > 0 ? Math.min(100, Math.round((Number(kpi.actual || 0) / Number(kpi.target)) * 100)) : 0; }
function statusClass(status) {
  if (status === "បានអនុម័ត") return "bg-[#E9F7EF] text-[#3FA66B]";
  if (status === "រង់ចាំអនុម័ត") return "bg-[#FDF3E3] text-[#B97816]";
  if (status === "ត្រូវកែប្រែ") return "bg-[#FBEBE8] text-[#D9614F]";
  return "bg-[#EEF1FB] text-[#2A3F8F]";
}

export default function KpiDashboardPage({ employees = [], kpis = [] }) {
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(() => emptyKpi(employees));
  const [reviewComment, setReviewComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState("");

  useEffect(() => {
    if (!form.employeeId && employees[0]?.id) setForm((value) => ({ ...value, employeeId: employees[0].id }));
  }, [employees, form.employeeId]);

  const summary = useMemo(() => {
    const scored = kpis.map((kpi) => ({ ...kpi, score: scoreOf(kpi), weight: Number(kpi.weight || 100), status: normalizedStatus(kpi) }));
    const approved = scored.filter((item) => item.status === "បានអនុម័ត");
    const totalWeight = approved.reduce((sum, item) => sum + item.weight, 0);
    const weightedAverage = totalWeight ? Math.round(approved.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight) : 0;
    return {
      scored, weightedAverage,
      pending: scored.filter((item) => item.status === "រង់ចាំអនុម័ត").length,
      needsFollowUp: approved.filter((item) => item.score < 70).length,
      approved: approved.length,
    };
  }, [kpis]);

  const openCreate = () => { setSelected(null); setForm(emptyKpi(employees)); setError(""); setModal("create"); };
  const openEdit = (kpi) => {
    setSelected(kpi);
    setForm({
      employeeId: kpi.employeeId || "", metric: kpi.metric || "", target: String(kpi.target || ""),
      actual: String(kpi.actual || 0), weight: String(kpi.weight || 100), period: kpi.period || new Date().toISOString().slice(0,7),
      cycle: kpi.cycle || "monthly", status: normalizedStatus(kpi), note: kpi.note || "",
    });
    setError(""); setModal("edit");
  };
  const openReview = (kpi, type) => { setSelected(kpi); setReviewComment(""); setError(""); setModal(type); };
  const close = () => { if (!saving) { setModal(null); setSelected(null); setError(""); } };
  const run = async (task) => {
    setSaving(true); setError("");
    try { await task(); setModal(null); setSelected(null); }
    catch (err) { setError(err.message || "មិនអាចរក្សាទុកបានទេ"); }
    finally { setSaving(false); }
  };

  const saveKpi = () => run(async () => {
    if (!form.employeeId || !form.metric.trim() || Number(form.target) <= 0 || Number(form.actual) < 0 || Number(form.weight) <= 0 || Number(form.weight) > 100) {
      throw new Error("សូមបំពេញ KPI, Target, Actual និង Weight (1–100) ឱ្យត្រឹមត្រូវ");
    }
    const payload = {
      ...form, target: Number(form.target), actual: Number(form.actual), weight: Number(form.weight),
    };
    if (modal === "create") await createKpi(payload);
    else await updateKpi(selected.kpiId, payload);
  });
  const submit = (kpi) => run(() => submitKpi(kpi.kpiId));
  const review = (decision) => run(async () => {
    if (decision === "return" && !reviewComment.trim()) throw new Error("សូមបញ្ចូលមូលហេតុឱ្យកែប្រែ");
    await reviewKpi(selected.kpiId, decision, reviewComment);
  });

  return <>
    <div className="flex items-start justify-between mb-5 sm:mb-6 gap-3 flex-wrap">
      <div><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">KPI Dashboard</h1><p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">Weighting, evaluation cycle និង approval workflow</p></div>
      <button onClick={openCreate} className="flex items-center gap-2 bg-[#2A3F8F] text-white text-sm font-semibold rounded-xl px-4 py-2.5"><Plus size={16}/>បន្ថែម KPI</button>
    </div>

    {error && !modal && <div className="mb-4 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#D9614F]">{error}</div>}

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard icon={Target} label="KPI ទាំងអស់" value={summary.scored.length} sub={`${summary.approved} បានអនុម័ត`} iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary}/>
      <StatCard icon={TrendingUp} label="ពិន្ទុមធ្យមមានទម្ងន់" value={`${summary.weightedAverage}%`} sub="គិតពី KPI ដែលបានអនុម័ត" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green}/>
      <StatCard icon={Target} label="រង់ចាំអនុម័ត" value={summary.pending} sub="ត្រូវការសេចក្តីសម្រេច" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent}/>
      <StatCard icon={Target} label="ត្រូវតាមដាន" value={summary.needsFollowUp} sub="បានអនុម័ត និងពិន្ទុក្រោម 70%" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent}/>
    </div>

    <div className="space-y-3">
      {summary.scored.map((item) => {
        const isOpen = expanded === item.kpiId;
        return <div key={item.kpiId} className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-4">
            <button type="button" onClick={() => setExpanded(isOpen ? "" : item.kpiId)} className="flex-1 text-left grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3 items-center">
              <div className="col-span-2 sm:col-span-1"><div className="font-semibold text-[#1E2333]">{item.employeeName || item.employeeId}</div><div className="text-xs text-[#8A8FA3]">{item.branch || "—"}</div></div>
              <Info label="សូចនាករ" value={item.metric}/>
              <Info label="រយៈពេល" value={`${item.period || "—"} · ${cycleLabels[item.cycle] || cycleLabels.monthly}`}/>
              <Info label="Target / Actual" value={`${item.target} / ${item.actual}`}/>
              <Info label="Weight" value={`${item.weight}%`}/>
              <div><div className="text-[11px] text-[#8A8FA3]">ពិន្ទុ</div><span className={`inline-flex mt-0.5 rounded-full px-2.5 py-1 text-xs font-semibold ${item.score >= 100 ? "bg-[#E9F7EF] text-[#3FA66B]" : item.score >= 70 ? "bg-[#EEF1FB] text-[#2A3F8F]" : "bg-[#FDF3E3] text-[#B97816]"}`}>{item.score}%</span></div>
              <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(item.status)}`}>{item.status}</span></div>
            </button>
            <div className="flex items-center flex-wrap gap-1.5 xl:justify-end">
              {["ព្រាង", "ត្រូវកែប្រែ"].includes(item.status) && <><button onClick={() => openEdit(item)} className="kpi-action"><Pencil size={15}/>កែប្រែ</button><button onClick={() => submit(item)} disabled={saving} className="kpi-action text-[#2A3F8F]"><Send size={15}/>ដាក់ស្នើ</button></>}
              {item.status === "រង់ចាំអនុម័ត" && <><button onClick={() => openReview(item, "approve")} className="kpi-action text-[#3FA66B]"><CheckCircle2 size={15}/>អនុម័ត</button><button onClick={() => openReview(item, "return")} className="kpi-action text-[#D9614F]"><RotateCcw size={15}/>ឱ្យកែប្រែ</button></>}
              <button onClick={() => setExpanded(isOpen ? "" : item.kpiId)} className="p-2 rounded-lg hover:bg-[#F5F6FA]">{isOpen ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}</button>
            </div>
          </div>
          {isOpen && <KpiDetails kpi={item}/>}
        </div>;
      })}
      {!summary.scored.length && <div className="bg-white rounded-2xl border border-[#EBEDF3] text-center py-14 text-[#8A8FA3]">មិនទាន់មាន KPI ទេ។</div>}
    </div>

    {(modal === "create" || modal === "edit") && <Modal title={modal === "create" ? "បន្ថែម KPI" : "កែប្រែ KPI"} close={close} save={saveKpi} saving={saving} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modal === "create" && <label className="kpi-field">បុគ្គលិក<select value={form.employeeId} onChange={(e) => setForm({...form, employeeId:e.target.value})} className="kpi-control"><option value="">ជ្រើសបុគ្គលិក</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}
        <Input label="ខែ/រយៈពេល" type="month" value={form.period} change={(value) => setForm({...form, period:value})}/>
        <label className="kpi-field sm:col-span-2">សូចនាករ *<input value={form.metric} onChange={(e) => setForm({...form, metric:e.target.value})} className="kpi-control" placeholder="ឧ. ចំនួនអតិថិជនថ្មី"/></label>
        <Input label="Target *" type="number" value={form.target} change={(value) => setForm({...form, target:value})}/>
        <Input label="Actual" type="number" value={form.actual} change={(value) => setForm({...form, actual:value})}/>
        <Input label="Weight (%) *" type="number" value={form.weight} change={(value) => setForm({...form, weight:value})}/>
        <label className="kpi-field">Evaluation cycle<select value={form.cycle} onChange={(e) => setForm({...form, cycle:e.target.value})} className="kpi-control"><option value="monthly">ប្រចាំខែ</option><option value="quarterly">ប្រចាំត្រីមាស</option><option value="yearly">ប្រចាំឆ្នាំ</option></select></label>
        {modal === "create" && <label className="kpi-field sm:col-span-2">រក្សាទុកជា<select value={form.status} onChange={(e) => setForm({...form, status:e.target.value})} className="kpi-control"><option value="ព្រាង">ព្រាង</option><option value="រង់ចាំអនុម័ត">ដាក់ស្នើសម្រាប់អនុម័តភ្លាម</option></select></label>}
        <label className="kpi-field sm:col-span-2">កំណត់ចំណាំ<textarea rows="3" value={form.note} onChange={(e) => setForm({...form, note:e.target.value})} className="kpi-control resize-none"/></label>
      </div>
    </Modal>}

    {(modal === "approve" || modal === "return") && <Modal title={modal === "approve" ? "អនុម័ត KPI" : "បញ្ជូនឱ្យកែប្រែ"} close={close} save={() => review(modal === "approve" ? "approve" : "return")} saving={saving} error={error} saveLabel={modal === "approve" ? "អនុម័ត" : "បញ្ជូនឱ្យកែប្រែ"} danger={modal === "return"}>
      <div className="rounded-xl bg-[#F7F8FB] p-3 mb-3 text-sm"><strong>{selected?.employeeName}</strong><span className="block text-xs text-[#8A8FA3] mt-1">{selected?.metric} · ពិន្ទុ {scoreOf(selected || {})}%</span></div>
      <label className="kpi-field">មតិយោបល់{modal === "return" ? " *" : ""}<textarea rows="4" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="kpi-control resize-none"/></label>
    </Modal>}

    <style>{`.kpi-field{font-size:12px;color:#5B5F73;display:block}.kpi-control{margin-top:4px;width:100%;background:#F5F6FA;border-radius:12px;padding:10px 12px;font-size:14px;outline:none}.kpi-action{display:inline-flex;align-items:center;gap:5px;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:600;background:#F7F8FB}.kpi-action:hover{background:#EEF1FB}`}</style>
  </>;
}

function KpiDetails({ kpi }) {
  const history = [...(Array.isArray(kpi.history) ? kpi.history : [])].reverse();
  return <div className="border-t border-[#EBEDF3] bg-[#FAFBFD] p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
    <div><h3 className="font-semibold text-sm text-[#1E2333] mb-3">ការវាយតម្លៃ</h3><div className="bg-white border border-[#EBEDF3] rounded-xl p-4 text-sm space-y-2"><p><strong>ពិន្ទុ៖</strong> {scoreOf(kpi)}%</p><p><strong>Weighted score៖</strong> {Math.round(scoreOf(kpi) * Number(kpi.weight || 100) / 100)}%</p><p><strong>Cycle៖</strong> {cycleLabels[kpi.cycle] || cycleLabels.monthly}</p><p><strong>កំណត់ចំណាំ៖</strong> {kpi.note || "—"}</p><p><strong>មតិអ្នកអនុម័ត៖</strong> {kpi.managerComment || "—"}</p>{kpi.reviewedByEmail && <p className="text-xs text-[#8A8FA3]">ពិនិត្យដោយ {kpi.reviewedByEmail} · {String(kpi.reviewedAt || "").slice(0,16).replace("T"," ")}</p>}</div></div>
    <div><h3 className="font-semibold text-sm text-[#1E2333] flex items-center gap-2 mb-3"><History size={16}/>Audit history</h3><div className="space-y-2">{history.map((item) => <div key={item.id} className="bg-white border border-[#EBEDF3] rounded-xl p-3 text-sm"><div className="font-medium">{item.label}</div><div className="text-xs text-[#8A8FA3] mt-1">{String(item.at || "").slice(0,16).replace("T"," ")} · {item.actorEmail || "—"}</div></div>)}{!history.length && <p className="text-xs text-[#8A8FA3]">Legacy record — មិនទាន់មាន audit history។</p>}</div></div>
  </div>;
}
function Info({ label, value }) { return <div><div className="text-[11px] text-[#8A8FA3]">{label}</div><div className="text-sm text-[#5B5F73] mt-0.5 line-clamp-2">{value}</div></div>; }
function Input({ label, value, change, type="text" }) { return <label className="kpi-field">{label}<input type={type} min={type === "number" ? "0" : undefined} value={value} onChange={(e) => change(e.target.value)} className="kpi-control"/></label>; }
function Modal({ title, children, close, save, saving, error, saveLabel="រក្សាទុក", danger=false }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"><div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[90vh] sm:rounded-2xl sm:p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-[#1E2333]">{title}</h2><button onClick={close} disabled={saving}><X size={20}/></button></div>{children}{error && <p className="text-sm text-[#D9614F] mt-3">{error}</p>}<div className="flex gap-2 mt-5"><button onClick={close} disabled={saving} className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm disabled:opacity-50">បោះបង់</button><button onClick={save} disabled={saving} className={`flex-1 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${danger ? "bg-[#D9614F]" : "bg-[#2A3F8F]"}`}>{saving && <Loader2 size={16} className="animate-spin"/>}{saveLabel}</button></div></div></div>; }
