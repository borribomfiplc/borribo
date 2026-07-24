import React, { useEffect, useMemo, useState } from "react";
import { todayISO } from "../utils/attendance";
import {
  Banknote, CheckCircle2, ChevronDown, ChevronUp, Download, History,
  Loader2, Pencil, Plus, RotateCcw, Send, WalletCards, X,
} from "lucide-react";
import StatCard from "../components/shared/StatCard";
import { COLORS } from "../data/theme";
import {
  createPayrollRecord, markPayrollPaid, reviewPayrollRecord,
  submitPayrollRecord, updatePayrollRecord,
} from "../services/operations";

const currentMonth = () => todayISO().slice(0, 7);
const today = () => todayISO();
const emptyPayroll = (employees = [], period = currentMonth()) => ({
  employeeId: employees[0]?.id || "", period, baseSalary: "", allowances: "0",
  bonus: "0", overtime: "0", deductions: "0", tax: "0", loanId: "",
  loanDeduction: "0", status: "ព្រាង", note: "",
});

function payrollStatus(record) { return record.status || "ព្រាង"; }
function totals(form) {
  const grossPay = [form.baseSalary, form.allowances, form.bonus, form.overtime].reduce((sum, value) => sum + Number(value || 0), 0);
  const netPay = grossPay - Number(form.deductions || 0) - Number(form.tax || 0) - Number(form.loanDeduction || 0);
  return { grossPay, netPay };
}
function statusClass(status) {
  if (status === "បានបើកប្រាក់") return "bg-[#E9F7EF] text-[#3FA66B]";
  if (status === "បានអនុម័ត") return "bg-[#EAF4FF] text-[#2477B3]";
  if (status === "រង់ចាំអនុម័ត") return "bg-[#FDF3E3] text-[#B97816]";
  if (status === "ត្រូវកែប្រែ") return "bg-[#FBEBE8] text-[#D9614F]";
  return "bg-[#EEF1FB] text-[#2A3F8F]";
}

export default function PayrollPage({ employees = [], payrollRecords = [], loans = [] }) {
  const [period, setPeriod] = useState(currentMonth);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(() => emptyPayroll(employees));
  const [comment, setComment] = useState("");
  const [payment, setPayment] = useState({ date: today(), reference: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState("");

  useEffect(() => {
    if (!form.employeeId && employees[0]?.id) setForm((value) => ({ ...value, employeeId: employees[0].id }));
  }, [employees, form.employeeId]);

  const rows = useMemo(() => payrollRecords.filter((record) => record.period === period), [payrollRecords, period]);
  const summary = useMemo(() => ({
    gross: rows.reduce((sum, record) => sum + Number(record.grossPay || 0), 0),
    net: rows.reduce((sum, record) => sum + Number(record.netPay || 0), 0),
    pending: rows.filter((record) => payrollStatus(record) === "រង់ចាំអនុម័ត").length,
    paid: rows.filter((record) => payrollStatus(record) === "បានបើកប្រាក់").length,
  }), [rows]);
  const activeLoans = useMemo(() => loans.filter((loan) => {
    const balance = loan.balance === undefined
      ? Math.max(0, Number(loan.amount || 0) - Number(loan.paidAmount || 0))
      : Number(loan.balance || 0);
    const status = loan.status || (balance > 0 ? "សកម្ម" : "បានសងរួច");
    return loan.employeeId === form.employeeId && status === "សកម្ម" && balance > 0;
  }), [loans, form.employeeId]);
  const preview = totals(form);

  const openCreate = () => { setSelected(null); setForm(emptyPayroll(employees, period)); setError(""); setModal("create"); };
  const openEdit = (record) => {
    setSelected(record);
    setForm({
      employeeId: record.employeeId || "", period: record.period || period,
      baseSalary: String(record.baseSalary || ""), allowances: String(record.allowances || 0),
      bonus: String(record.bonus || 0), overtime: String(record.overtime || 0),
      deductions: String(record.deductions || 0), tax: String(record.tax || 0),
      loanId: record.loanId || "", loanDeduction: String(record.loanDeduction || 0),
      status: payrollStatus(record), note: record.note || "",
    });
    setError(""); setModal("edit");
  };
  const openAction = (record, type) => {
    setSelected(record); setComment(""); setPayment({ date: today(), reference: "" }); setError(""); setModal(type);
  };
  const close = () => { if (!saving) { setModal(null); setSelected(null); setError(""); } };
  const run = async (task, shouldClose = true) => {
    setSaving(true); setError("");
    try { await task(); if (shouldClose) { setModal(null); setSelected(null); } }
    catch (err) { setError(err.message || "មិនអាចរក្សាទុកបានទេ"); }
    finally { setSaving(false); }
  };

  const savePayroll = () => run(async () => {
    if (!form.employeeId || Number(form.baseSalary) <= 0 || preview.netPay < 0) throw new Error("សូមបំពេញប្រាក់ខែគោល និងការកាត់ប្រាក់ឱ្យត្រឹមត្រូវ");
    if (Number(form.loanDeduction || 0) > 0 && !form.loanId) throw new Error("សូមជ្រើសកម្ចីសម្រាប់ការកាត់ប្រាក់");
    const payload = {
      ...form,
      baseSalary: Number(form.baseSalary), allowances: Number(form.allowances || 0), bonus: Number(form.bonus || 0),
      overtime: Number(form.overtime || 0), deductions: Number(form.deductions || 0), tax: Number(form.tax || 0),
      loanDeduction: Number(form.loanDeduction || 0),
    };
    if (modal === "create") await createPayrollRecord(payload);
    else await updatePayrollRecord(selected.payrollId, payload);
  });
  const submit = (record) => run(() => submitPayrollRecord(record.payrollId));
  const review = (decision) => run(async () => {
    if (decision === "return" && !comment.trim()) throw new Error("សូមបញ្ចូលមូលហេតុឱ្យកែប្រែ");
    await reviewPayrollRecord(selected.payrollId, decision, comment);
  });
  const markPaid = () => run(async () => {
    await markPayrollPaid(selected.payrollId, payment);
  });

  const exportCsv = () => {
    const headers = ["Period", "Employee ID", "Employee", "Branch", "Base salary", "Allowances", "Bonus", "Overtime", "Deductions", "Tax", "Loan deduction", "Gross", "Net", "Status", "Payment date", "Reference"];
    const csvRows = rows.map((record) => [record.period, record.employeeId, record.employeeName, record.branch, record.baseSalary, record.allowances, record.bonus, record.overtime, record.deductions, record.tax, record.loanDeduction, record.grossPay, record.netPay, payrollStatus(record), record.paymentDate || "", record.paymentReference || ""]);
    const escape = (value) => {
      const text = String(value ?? "");
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const blob = new Blob(["\ufeff", [headers, ...csvRows].map((line) => line.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `payroll-${period}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return <>
    <div className="flex items-start justify-between mb-5 sm:mb-6 gap-3 flex-wrap">
      <div><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ប្រាក់ខែ</h1><p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">Draft, approval, payment និងការកាត់ Staff Loan</p></div>
      <div className="flex gap-2 flex-wrap"><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-xl bg-white border border-[#EBEDF3] px-3 py-2.5 text-sm"/><button onClick={exportCsv} disabled={!rows.length} className="payroll-toolbar"><Download size={16}/>CSV</button><button onClick={openCreate} className="flex items-center gap-2 bg-[#2A3F8F] text-white text-sm font-semibold rounded-xl px-4 py-2.5"><Plus size={16}/>បង្កើតបញ្ជីប្រាក់ខែ</button></div>
    </div>

    {error && !modal && <div className="mb-4 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#D9614F]">{error}</div>}

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard icon={WalletCards} label="បុគ្គលិកក្នុងបញ្ជី" value={rows.length} sub={`${summary.paid} បានបើកប្រាក់`} iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary}/>
      <StatCard icon={Banknote} label="Gross payroll" value={`${summary.gross.toLocaleString()} $`} sub={period} iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary}/>
      <StatCard icon={Banknote} label="Net payroll" value={`${summary.net.toLocaleString()} $`} sub="ក្រោយការកាត់ប្រាក់" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green}/>
      <StatCard icon={WalletCards} label="រង់ចាំអនុម័ត" value={summary.pending} sub="ត្រូវការសេចក្តីសម្រេច" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent}/>
    </div>

    <div className="space-y-3">
      {rows.map((record) => {
        const status = payrollStatus(record); const isOpen = expanded === record.payrollId;
        return <div key={record.payrollId} className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-4">
            <button type="button" onClick={() => setExpanded(isOpen ? "" : record.payrollId)} className="flex-1 text-left grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 items-center">
              <div className="col-span-2 sm:col-span-1"><div className="font-semibold text-[#1E2333]">{record.employeeName || record.employeeId}</div><div className="text-xs text-[#8A8FA3]">{record.employeeId} · {record.branch || "—"}</div></div>
              <Info label="ប្រាក់ខែគោល" value={`${Number(record.baseSalary || 0).toLocaleString()} $`}/>
              <Info label="Gross" value={`${Number(record.grossPay || 0).toLocaleString()} $`}/>
              <Info label="ការកាត់សរុប" value={`${(Number(record.deductions || 0) + Number(record.tax || 0) + Number(record.loanDeduction || 0)).toLocaleString()} $`}/>
              <Info label="Net pay" value={`${Number(record.netPay || 0).toLocaleString()} $`} strong/>
              <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}>{status}</span></div>
            </button>
            <div className="flex items-center flex-wrap gap-1.5 xl:justify-end">
              {["ព្រាង", "ត្រូវកែប្រែ"].includes(status) && <><button onClick={() => openEdit(record)} className="payroll-action"><Pencil size={15}/>កែប្រែ</button><button onClick={() => submit(record)} disabled={saving} className="payroll-action text-[#2A3F8F]"><Send size={15}/>ដាក់ស្នើ</button></>}
              {status === "រង់ចាំអនុម័ត" && <><button onClick={() => openAction(record, "approve")} className="payroll-action text-[#3FA66B]"><CheckCircle2 size={15}/>អនុម័ត</button><button onClick={() => openAction(record, "return")} className="payroll-action text-[#D9614F]"><RotateCcw size={15}/>ឱ្យកែប្រែ</button></>}
              {status === "បានអនុម័ត" && <button onClick={() => openAction(record, "pay")} className="payroll-action text-[#3FA66B]"><Banknote size={15}/>បើកប្រាក់រួច</button>}
              <button onClick={() => setExpanded(isOpen ? "" : record.payrollId)} className="p-2 rounded-lg hover:bg-[#F5F6FA]">{isOpen ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}</button>
            </div>
          </div>
          {isOpen && <PayrollDetails record={record}/>}
        </div>;
      })}
      {!rows.length && <div className="bg-white rounded-2xl border border-[#EBEDF3] text-center py-14 text-[#8A8FA3]">មិនទាន់មានបញ្ជីប្រាក់ខែសម្រាប់ {period} ទេ។</div>}
    </div>

    {(modal === "create" || modal === "edit") && <Modal title={modal === "create" ? "បង្កើតបញ្ជីប្រាក់ខែ" : "កែប្រែបញ្ជីប្រាក់ខែ"} close={close} save={savePayroll} saving={saving} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modal === "create" && <label className="payroll-field">បុគ្គលិក<select value={form.employeeId} onChange={(event) => setForm({...form, employeeId:event.target.value, loanId:"", loanDeduction:"0"})} className="payroll-control"><option value="">ជ្រើសបុគ្គលិក</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}
        {modal === "create" && <Input label="ខែ" type="month" value={form.period} change={(value) => setForm({...form, period:value})}/>}
        <Input label="ប្រាក់ខែគោល (USD) *" type="number" value={form.baseSalary} change={(value) => setForm({...form, baseSalary:value})}/>
        <Input label="ប្រាក់ឧបត្ថម្ភ" type="number" value={form.allowances} change={(value) => setForm({...form, allowances:value})}/>
        <Input label="Bonus" type="number" value={form.bonus} change={(value) => setForm({...form, bonus:value})}/>
        <Input label="Overtime" type="number" value={form.overtime} change={(value) => setForm({...form, overtime:value})}/>
        <Input label="ការកាត់ផ្សេងៗ" type="number" value={form.deductions} change={(value) => setForm({...form, deductions:value})}/>
        <Input label="ពន្ធ" type="number" value={form.tax} change={(value) => setForm({...form, tax:value})}/>
        <label className="payroll-field">កម្ចីបុគ្គលិក<select value={form.loanId} onChange={(event) => setForm({...form, loanId:event.target.value, loanDeduction:event.target.value ? form.loanDeduction : "0"})} className="payroll-control"><option value="">មិនកាត់កម្ចី</option>{activeLoans.map((loan) => <option key={loan.loanId} value={loan.loanId}>{loan.loanId} · នៅសល់ {Number(loan.balance ?? Math.max(0, Number(loan.amount || 0) - Number(loan.paidAmount || 0))).toLocaleString()} $</option>)}</select></label>
        <Input label="ចំនួនកាត់កម្ចី" type="number" value={form.loanDeduction} change={(value) => setForm({...form, loanDeduction:value})}/>
        {modal === "create" && <label className="payroll-field sm:col-span-2">រក្សាទុកជា<select value={form.status} onChange={(event) => setForm({...form, status:event.target.value})} className="payroll-control"><option value="ព្រាង">ព្រាង</option><option value="រង់ចាំអនុម័ត">ដាក់ស្នើភ្លាម</option></select></label>}
        <label className="payroll-field sm:col-span-2">កំណត់ចំណាំ<textarea rows="3" value={form.note} onChange={(event) => setForm({...form, note:event.target.value})} className="payroll-control resize-none"/></label>
      </div>
      <div className={`mt-4 rounded-xl p-3 text-sm ${preview.netPay < 0 ? "bg-[#FBEBE8] text-[#D9614F]" : "bg-[#F7F8FB] text-[#1E2333]"}`}><div className="flex justify-between"><span>Gross</span><strong>{preview.grossPay.toLocaleString()} $</strong></div><div className="flex justify-between mt-1"><span>Net pay</span><strong>{preview.netPay.toLocaleString()} $</strong></div></div>
    </Modal>}

    {(modal === "approve" || modal === "return") && <Modal title={modal === "approve" ? "អនុម័តបញ្ជីប្រាក់ខែ" : "បញ្ជូនឱ្យកែប្រែ"} close={close} save={() => review(modal === "approve" ? "approve" : "return")} saving={saving} error={error} saveLabel={modal === "approve" ? "អនុម័ត" : "បញ្ជូនឱ្យកែប្រែ"} danger={modal === "return"}>
      <div className="rounded-xl bg-[#F7F8FB] p-3 mb-3 text-sm"><strong>{selected?.employeeName}</strong><span className="block text-xs text-[#8A8FA3] mt-1">Net pay {Number(selected?.netPay || 0).toLocaleString()} $ · {selected?.period}</span></div>
      <label className="payroll-field">មតិយោបល់{modal === "return" ? " *" : ""}<textarea rows="4" value={comment} onChange={(event) => setComment(event.target.value)} className="payroll-control resize-none"/></label>
    </Modal>}

    {modal === "pay" && <Modal title="កត់សម្គាល់ថាបើកប្រាក់រួច" close={close} save={markPaid} saving={saving} error={error} saveLabel="បញ្ជាក់ការបើកប្រាក់">
      <div className="rounded-xl bg-[#E9F7EF] p-3 mb-3 text-sm"><strong>{selected?.employeeName}</strong><span className="block mt-1">Net pay {Number(selected?.netPay || 0).toLocaleString()} $</span>{Number(selected?.loanDeduction || 0) > 0 && <span className="block text-xs mt-1">ប្រព័ន្ធនឹងកត់ត្រាការសងកម្ចី {Number(selected.loanDeduction).toLocaleString()} $ ក្នុង transaction ដូចគ្នា។</span>}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Input label="ថ្ងៃបើកប្រាក់" type="date" value={payment.date} change={(value) => setPayment({...payment, date:value})}/><Input label="លេខយោងធនាគារ/សាច់ប្រាក់" value={payment.reference} change={(value) => setPayment({...payment, reference:value})}/></div>
    </Modal>}

    <style>{`.payroll-field{font-size:12px;color:#5B5F73;display:block}.payroll-control{margin-top:4px;width:100%;background:#F5F6FA;border-radius:12px;padding:10px 12px;font-size:14px;outline:none}.payroll-action{display:inline-flex;align-items:center;gap:5px;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:600;background:#F7F8FB}.payroll-action:hover{background:#EEF1FB}.payroll-toolbar{display:inline-flex;align-items:center;gap:6px;border:1px solid #EBEDF3;background:white;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:600}.payroll-toolbar:disabled{opacity:.45}`}</style>
  </>;
}

function PayrollDetails({ record }) {
  const history = [...(Array.isArray(record.history) ? record.history : [])].reverse();
  return <div className="border-t border-[#EBEDF3] bg-[#FAFBFD] p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
    <div><h3 className="font-semibold text-sm text-[#1E2333] mb-3">សេចក្តីលម្អិត</h3><div className="bg-white border border-[#EBEDF3] rounded-xl p-4 text-sm grid grid-cols-2 gap-3"><Info label="ប្រាក់ឧបត្ថម្ភ" value={`${Number(record.allowances || 0).toLocaleString()} $`}/><Info label="Bonus" value={`${Number(record.bonus || 0).toLocaleString()} $`}/><Info label="Overtime" value={`${Number(record.overtime || 0).toLocaleString()} $`}/><Info label="ការកាត់ផ្សេងៗ" value={`${Number(record.deductions || 0).toLocaleString()} $`}/><Info label="ពន្ធ" value={`${Number(record.tax || 0).toLocaleString()} $`}/><Info label="កាត់កម្ចី" value={`${Number(record.loanDeduction || 0).toLocaleString()} $`}/><div className="col-span-2 text-xs text-[#5B5F73]">កំណត់ចំណាំ៖ {record.note || "—"}</div>{record.managerComment && <div className="col-span-2 text-xs text-[#5B5F73]">មតិអ្នកអនុម័ត៖ {record.managerComment}</div>}{record.paymentDate && <div className="col-span-2 text-xs text-[#3FA66B]">បានបើកប្រាក់៖ {record.paymentDate}{record.paymentReference ? ` · ${record.paymentReference}` : ""}</div>}</div></div>
    <div><h3 className="font-semibold text-sm text-[#1E2333] flex items-center gap-2 mb-3"><History size={16}/>Audit history</h3><div className="space-y-2">{history.map((item) => <div key={item.id} className="bg-white border border-[#EBEDF3] rounded-xl p-3 text-sm"><div className="font-medium">{item.label}</div><div className="text-xs text-[#8A8FA3] mt-1">{String(item.at || "").slice(0,16).replace("T"," ")} · {item.actorEmail || "—"}</div></div>)}{!history.length && <p className="text-xs text-[#8A8FA3]">មិនទាន់មាន audit history។</p>}</div></div>
  </div>;
}
function Info({ label, value, strong }) { return <div><div className="text-[11px] text-[#8A8FA3]">{label}</div><div className={`text-sm mt-0.5 ${strong ? "font-semibold text-[#1E2333]" : "text-[#5B5F73]"}`}>{value}</div></div>; }
function Input({ label, value, change, type="text" }) { return <label className="payroll-field">{label}<input type={type} min={type === "number" ? "0" : undefined} value={value} onChange={(event) => change(event.target.value)} className="payroll-control"/></label>; }
function Modal({ title, children, close, save, saving, error, saveLabel="រក្សាទុក", danger=false }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"><div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[90vh] sm:rounded-2xl sm:p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-[#1E2333]">{title}</h2><button onClick={close} disabled={saving}><X size={20}/></button></div>{children}{error && <p className="text-sm text-[#D9614F] mt-3">{error}</p>}<div className="flex gap-2 mt-5"><button onClick={close} disabled={saving} className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm disabled:opacity-50">បោះបង់</button><button onClick={save} disabled={saving} className={`flex-1 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${danger ? "bg-[#D9614F]" : "bg-[#2A3F8F]"}`}>{saving && <Loader2 size={16} className="animate-spin"/>}{saveLabel}</button></div></div></div>; }
