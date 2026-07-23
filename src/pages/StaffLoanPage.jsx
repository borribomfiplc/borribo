import React, { useEffect, useMemo, useState } from "react";
import {
  Banknote, Ban, CheckCircle2, ChevronDown, ChevronUp, Download, FileText, History,
  Loader2, Paperclip, Pencil, Plus, Trash2, WalletCards, X, XCircle,
} from "lucide-react";
import StatCard from "../components/shared/StatCard";
import { COLORS } from "../data/theme";
import {
  cancelStaffLoan, createStaffLoan, decideStaffLoan,
  recordStaffLoanPayment, updateStaffLoan,
} from "../services/operations";
import {
  deleteLoanAttachment, downloadLoanAttachment, uploadLoanFiles, validateLoanFiles,
} from "../services/loanAttachments";

const today = () => new Date().toISOString().slice(0, 10);
const emptyLoan = (employees = []) => ({
  employeeId: employees[0]?.id || "", amount: "", monthlyPayment: "",
  startDate: today(), purpose: "",
});
const emptyPayment = () => ({ amount: "", date: today(), note: "" });

function loanStatus(loan) {
  if (loan.status) return loan.status;
  return Number(loan.paidAmount || 0) >= Number(loan.amount || 0) && Number(loan.amount || 0) > 0 ? "បានសងរួច" : "សកម្ម";
}
function loanBalance(loan) {
  return Math.max(0, Number(loan.balance ?? (Number(loan.amount || 0) - Number(loan.paidAmount || 0))));
}
function statusClass(status) {
  if (status === "បានសងរួច") return "bg-[#E9F7EF] text-[#3FA66B]";
  if (status === "សកម្ម") return "bg-[#EEF1FB] text-[#2A3F8F]";
  if (status === "រង់ចាំអនុម័ត") return "bg-[#FDF3E3] text-[#B97816]";
  if (status === "បដិសេធ" || status === "បានលុបចោល") return "bg-[#FBEBE8] text-[#D9614F]";
  return "bg-[#F2F3F7] text-[#5B5F73]";
}

export default function StaffLoanPage({ employees = [], loans = [] }) {
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loanForm, setLoanForm] = useState(() => emptyLoan(employees));
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState("");
  const [loanFiles, setLoanFiles] = useState([]);
  const [keptAttachments, setKeptAttachments] = useState([]);
  const [removedAttachments, setRemovedAttachments] = useState([]);

  useEffect(() => {
    if (!loanForm.employeeId && employees[0]?.id) setLoanForm((value) => ({ ...value, employeeId: employees[0].id }));
  }, [employees, loanForm.employeeId]);

  const summary = useMemo(() => ({
    outstanding: loans.filter((loan) => !["បដិសេធ", "បានលុបចោល"].includes(loanStatus(loan))).reduce((sum, loan) => sum + loanBalance(loan), 0),
    active: loans.filter((loan) => loanStatus(loan) === "សកម្ម").length,
    pending: loans.filter((loan) => loanStatus(loan) === "រង់ចាំអនុម័ត").length,
    repaid: loans.filter((loan) => loanStatus(loan) === "បានសងរួច").length,
  }), [loans]);

  const openCreate = () => {
    setSelected(null); setLoanForm(emptyLoan(employees)); setLoanFiles([]); setKeptAttachments([]); setRemovedAttachments([]); setError(""); setModal("create");
  };
  const openEdit = (loan) => {
    setSelected(loan);
    setLoanForm({
      employeeId: loan.employeeId || "", amount: String(loan.amount || ""),
      monthlyPayment: String(loan.monthlyPayment || ""), startDate: loan.startDate || today(), purpose: loan.purpose || "",
    });
    setLoanFiles([]); setKeptAttachments(Array.isArray(loan.attachments) ? loan.attachments : []); setRemovedAttachments([]);
    setError(""); setModal("edit");
  };
  const openAction = (type, loan) => {
    setSelected(loan); setPaymentForm(emptyPayment()); setNote(""); setError(""); setModal(type);
  };
  const closeModal = () => { if (!saving) { setModal(null); setSelected(null); setLoanFiles([]); setKeptAttachments([]); setRemovedAttachments([]); setError(""); } };

  const run = async (task) => {
    setSaving(true); setError("");
    try { await task(); closeModal(); }
    catch (err) { setError(err.message || "មិនអាចរក្សាទុកបានទេ"); }
    finally { setSaving(false); }
  };

  const selectLoanFiles = (files) => {
    const rows = Array.from(files || []);
    const validationError = validateLoanFiles(rows, keptAttachments.length + loanFiles.length);
    if (validationError) { setError(validationError); return; }
    setLoanFiles((current) => [...current, ...rows]);
    setError("");
  };
  const removeExistingAttachment = (attachment) => {
    setKeptAttachments((current) => current.filter((item) => item.path !== attachment.path));
    setRemovedAttachments((current) => [...current, attachment]);
  };

  const saveLoan = () => run(async () => {
    if (!loanForm.employeeId || Number(loanForm.amount) <= 0 || Number(loanForm.monthlyPayment || 0) < 0 || !loanForm.purpose.trim()) {
      throw new Error("សូមជ្រើសបុគ្គលិក និងបំពេញចំនួនកម្ចី/គោលបំណងឱ្យត្រឹមត្រូវ");
    }
    const validationError = validateLoanFiles(loanFiles, keptAttachments.length);
    if (validationError) throw new Error(validationError);
    let uploaded = [];
    try {
      if (loanFiles.length) uploaded = await uploadLoanFiles(loanFiles, selected?.loanId || `draft-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
      const attachments = [...keptAttachments, ...uploaded];
      if (modal === "create") await createStaffLoan({ ...loanForm, amount: Number(loanForm.amount), monthlyPayment: Number(loanForm.monthlyPayment || 0), attachments });
      else await updateStaffLoan(selected.loanId, {
        amount: Number(loanForm.amount), monthlyPayment: Number(loanForm.monthlyPayment || 0),
        startDate: loanForm.startDate, purpose: loanForm.purpose, attachments,
      });
      await Promise.allSettled(removedAttachments.map(deleteLoanAttachment));
    } catch (saveError) {
      await Promise.allSettled(uploaded.map(deleteLoanAttachment));
      throw saveError;
    }
  });

  const savePayment = () => run(async () => {
    const balance = loanBalance(selected || {});
    if (Number(paymentForm.amount) <= 0 || Number(paymentForm.amount) > balance) throw new Error(`ចំនួនសងត្រូវធំជាង 0 និងមិនលើស ${balance.toLocaleString()} $`);
    await recordStaffLoanPayment(selected.loanId, { ...paymentForm, amount: Number(paymentForm.amount) });
  });

  const decide = (decision) => run(async () => {
    if (decision === "reject" && !note.trim()) throw new Error("សូមបញ្ចូលមូលហេតុបដិសេធ");
    await decideStaffLoan(selected.loanId, decision, note);
  });

  const cancel = () => run(async () => {
    if (!note.trim()) throw new Error("សូមបញ្ចូលមូលហេតុលុបចោល");
    await cancelStaffLoan(selected.loanId, note);
  });

  return <>
    <div className="flex items-start justify-between mb-5 sm:mb-6 gap-3 flex-wrap">
      <div><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">កម្ចីបុគ្គលិក</h1><p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">Workflow អនុម័ត ការសងប្រាក់ និងប្រវត្តិប្រតិបត្តិការ</p></div>
      <button onClick={openCreate} className="flex items-center gap-2 bg-[#2A3F8F] text-white text-sm font-semibold rounded-xl px-4 py-2.5"><Plus size={16}/>បង្កើតសំណើកម្ចី</button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard icon={Banknote} label="រង់ចាំអនុម័ត" value={summary.pending} sub="សំណើកម្ចី" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent}/>
      <StatCard icon={Banknote} label="កម្ចីកំពុងសកម្ម" value={summary.active} sub="គណនីកម្ចី" iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary}/>
      <StatCard icon={Banknote} label="សមតុល្យនៅសល់" value={`${summary.outstanding.toLocaleString()} $`} sub="ប្រាក់មិនទាន់សង" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent}/>
      <StatCard icon={Banknote} label="បានសងរួច" value={summary.repaid} sub="បិទកម្ចីរួចរាល់" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green}/>
    </div>

    <div className="space-y-3">
      {loans.map((loan) => {
        const status = loanStatus(loan); const balance = loanBalance(loan); const isOpen = expanded === loan.loanId;
        return <div key={loan.loanId} className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-4">
            <button type="button" onClick={() => setExpanded(isOpen ? "" : loan.loanId)} className="flex-1 text-left grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 items-center">
              <div className="col-span-2 sm:col-span-1"><div className="font-semibold text-[#1E2333]">{loan.employeeName || loan.employeeId}</div><div className="text-xs text-[#8A8FA3]">{loan.branch || "—"}</div></div>
              <Info label="ចំនួនកម្ចី" value={`${Number(loan.amount || 0).toLocaleString()} $`}/>
              <Info label="បានសង" value={`${Number(loan.paidAmount || 0).toLocaleString()} $`}/>
              <Info label="នៅសល់" value={`${balance.toLocaleString()} $`} strong/>
              <Info label="ចាប់ផ្ដើម" value={loan.startDate || "—"}/>
              <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}>{status}</span></div>
            </button>
            <div className="flex items-center flex-wrap gap-1.5 xl:justify-end">
              {(status === "រង់ចាំអនុម័ត" || status === "សកម្ម") && <button onClick={() => openEdit(loan)} className="action-button"><Pencil size={15}/>កែប្រែ</button>}
              {status === "រង់ចាំអនុម័ត" && <><button onClick={() => openAction("approve", loan)} className="action-button text-[#3FA66B]"><CheckCircle2 size={15}/>អនុម័ត</button><button onClick={() => openAction("reject", loan)} className="action-button text-[#D9614F]"><XCircle size={15}/>បដិសេធ</button></>}
              {status === "សកម្ម" && <button onClick={() => openAction("payment", loan)} className="action-button text-[#2A3F8F]"><WalletCards size={15}/>កត់ត្រាការសង</button>}
              {["រង់ចាំអនុម័ត", "សកម្ម"].includes(status) && <button onClick={() => openAction("cancel", loan)} className="action-button text-[#D9614F]"><Ban size={15}/>លុបចោល</button>}
              <button onClick={() => setExpanded(isOpen ? "" : loan.loanId)} className="p-2 rounded-lg hover:bg-[#F5F6FA]" aria-label="បង្ហាញប្រវត្តិ">{isOpen ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}</button>
            </div>
          </div>
          {isOpen && <LoanDetails loan={loan}/>}
        </div>;
      })}
      {!loans.length && <div className="bg-white rounded-2xl border border-[#EBEDF3] text-center py-14 text-[#8A8FA3]">មិនទាន់មានកម្ចីបុគ្គលិកទេ។</div>}
    </div>

    {(modal === "create" || modal === "edit") && <Modal title={modal === "create" ? "បង្កើតសំណើកម្ចី" : "កែប្រែកម្ចី"} close={closeModal} saving={saving} error={error} save={saveLoan}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modal === "create" && <label className="field sm:col-span-2">បុគ្គលិក<select value={loanForm.employeeId} onChange={(e) => setLoanForm({...loanForm, employeeId:e.target.value})} className="control"><option value="">ជ្រើសបុគ្គលិក</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}
        <Input label="ចំនួនកម្ចី (USD) *" type="number" value={loanForm.amount} change={(value) => setLoanForm({...loanForm, amount:value})}/>
        <Input label="សងប្រចាំខែ (USD)" type="number" value={loanForm.monthlyPayment} change={(value) => setLoanForm({...loanForm, monthlyPayment:value})}/>
        <Input label="ថ្ងៃចាប់ផ្ដើម" type="date" value={loanForm.startDate} change={(value) => setLoanForm({...loanForm, startDate:value})}/>
        <label className="field sm:col-span-2">គោលបំណង *<textarea value={loanForm.purpose} onChange={(e) => setLoanForm({...loanForm, purpose:e.target.value})} rows="3" className="control resize-none"/></label>
        <label className="field sm:col-span-2">ឯកសារភ្ជាប់
          <span className="mt-1 flex items-center justify-center gap-2 border border-dashed border-[#C9CEDC] rounded-xl p-3 text-sm text-[#2A3F8F] cursor-pointer hover:bg-[#F7F8FB]"><Paperclip size={16}/>ជ្រើស PDF ឬរូបភាព<input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { selectLoanFiles(event.target.files); event.target.value = ""; }}/></span>
        </label>
        {(keptAttachments.length > 0 || loanFiles.length > 0) && <div className="sm:col-span-2 space-y-2">
          {keptAttachments.map((attachment) => <div key={attachment.path} className="flex items-center gap-2 rounded-xl bg-[#F7F8FB] px-3 py-2 text-sm"><FileText size={16} className="text-[#2A3F8F]"/><span className="flex-1 truncate">{attachment.name}</span><button type="button" onClick={() => removeExistingAttachment(attachment)} className="text-[#D9614F] p-1" aria-label="លុបឯកសារ"><Trash2 size={15}/></button></div>)}
          {loanFiles.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-2 rounded-xl bg-[#EEF1FB] px-3 py-2 text-sm"><Paperclip size={16} className="text-[#2A3F8F]"/><span className="flex-1 truncate">{file.name}</span><button type="button" onClick={() => setLoanFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-[#D9614F] p-1" aria-label="ដកឯកសារ"><X size={15}/></button></div>)}
        </div>}
      </div>
      {modal === "create" && <p className="text-xs text-[#8A8FA3] mt-3">សំណើថ្មីនឹងចូលស្ថានភាព “រង់ចាំអនុម័ត” ហើយមិនអាចកត់ត្រាការសងបានមុនអនុម័តទេ។</p>}
    </Modal>}

    {modal === "payment" && <Modal title={`កត់ត្រាការសង · ${selected?.employeeName || ""}`} close={closeModal} saving={saving} error={error} save={savePayment} saveLabel="កត់ត្រាការសង">
      <div className="rounded-xl bg-[#F7F8FB] p-3 mb-3 text-sm">សមតុល្យនៅសល់៖ <strong>{loanBalance(selected || {}).toLocaleString()} $</strong></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Input label="ចំនួនសង (USD) *" type="number" value={paymentForm.amount} change={(value) => setPaymentForm({...paymentForm, amount:value})}/><Input label="ថ្ងៃសង" type="date" value={paymentForm.date} change={(value) => setPaymentForm({...paymentForm, date:value})}/><label className="field sm:col-span-2">កំណត់ចំណាំ<textarea rows="3" value={paymentForm.note} onChange={(e) => setPaymentForm({...paymentForm, note:e.target.value})} className="control resize-none"/></label></div>
    </Modal>}

    {(modal === "approve" || modal === "reject") && <Modal title={modal === "approve" ? "អនុម័តកម្ចី" : "បដិសេធកម្ចី"} close={closeModal} saving={saving} error={error} save={() => decide(modal === "approve" ? "approve" : "reject")} saveLabel={modal === "approve" ? "អនុម័ត" : "បដិសេធ"} danger={modal === "reject"}>
      <p className="text-sm text-[#5B5F73] mb-3">{selected?.employeeName} · {Number(selected?.amount || 0).toLocaleString()} $</p>
      <label className="field">កំណត់ចំណាំ{modal === "reject" ? " *" : ""}<textarea rows="4" value={note} onChange={(e) => setNote(e.target.value)} className="control resize-none" placeholder={modal === "reject" ? "មូលហេតុបដិសេធ" : "កំណត់ចំណាំបន្ថែម"}/></label>
    </Modal>}

    {modal === "cancel" && <Modal title="លុបចោលកម្ចី" close={closeModal} saving={saving} error={error} save={cancel} saveLabel="លុបចោល" danger>
      <p className="text-sm text-[#5B5F73] mb-3">ប្រតិបត្តិការនេះរក្សាប្រវត្តិទុក ហើយមិនលុប record ចេញពីប្រព័ន្ធទេ។</p>
      <label className="field">មូលហេតុ *<textarea rows="4" value={note} onChange={(e) => setNote(e.target.value)} className="control resize-none"/></label>
    </Modal>}

    <style>{`.field{font-size:12px;color:#5B5F73;display:block}.control{margin-top:4px;width:100%;background:#F5F6FA;border-radius:12px;padding:10px 12px;font-size:14px;outline:none}.action-button{display:inline-flex;align-items:center;gap:5px;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:600;background:#F7F8FB}.action-button:hover{background:#EEF1FB}`}</style>
  </>;
}

function LoanDetails({ loan }) {
  const payments = [...(Array.isArray(loan.payments) ? loan.payments : [])].reverse();
  const history = [...(Array.isArray(loan.history) ? loan.history : [])].reverse();
  const attachments = Array.isArray(loan.attachments) ? loan.attachments : [];
  return <div className="border-t border-[#EBEDF3] bg-[#FAFBFD] p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
    <div><h3 className="font-semibold text-sm text-[#1E2333] flex items-center gap-2 mb-3"><WalletCards size={16}/>ប្រវត្តិសងប្រាក់</h3><div className="space-y-2">{payments.map((payment) => <div key={payment.paymentId} className="bg-white border border-[#EBEDF3] rounded-xl p-3 flex justify-between gap-3 text-sm"><div><div>{payment.date} · {payment.note || "ការសងប្រាក់"}</div><div className="text-xs text-[#8A8FA3] mt-1">ដោយ {payment.recordedByEmail || "—"}</div></div><strong>{Number(payment.amount || 0).toLocaleString()} $</strong></div>)}{!payments.length && <p className="text-xs text-[#8A8FA3]">មិនទាន់មានការសងប្រាក់។</p>}</div></div>
    <div><h3 className="font-semibold text-sm text-[#1E2333] flex items-center gap-2 mb-3"><History size={16}/>Audit history</h3><div className="space-y-2">{history.map((item) => <div key={item.id} className="bg-white border border-[#EBEDF3] rounded-xl p-3 text-sm"><div className="font-medium">{item.label}</div><div className="text-xs text-[#8A8FA3] mt-1">{String(item.at || "").slice(0,16).replace("T"," ")} · {item.actorEmail || "—"}</div></div>)}{!history.length && <p className="text-xs text-[#8A8FA3]">Legacy record — មិនទាន់មាន audit history។</p>}</div></div>
    <div><h3 className="font-semibold text-sm text-[#1E2333] flex items-center gap-2 mb-3"><Paperclip size={16}/>ឯកសារភ្ជាប់</h3><div className="space-y-2">{attachments.map((attachment) => <button type="button" key={attachment.path} onClick={() => downloadLoanAttachment(attachment).catch(() => {})} className="w-full bg-white border border-[#EBEDF3] rounded-xl p-3 flex items-center gap-2 text-sm text-left hover:bg-[#F7F8FB]"><FileText size={16} className="text-[#2A3F8F]"/><span className="flex-1 truncate">{attachment.name}</span><Download size={15}/></button>)}{!attachments.length && <p className="text-xs text-[#8A8FA3]">មិនមានឯកសារភ្ជាប់។</p>}</div></div>
    <div className="text-sm text-[#5B5F73]"><strong>គោលបំណង៖</strong> {loan.purpose || "—"}{loan.decisionNote && <span className="block mt-1"><strong>កំណត់ចំណាំសេចក្តីសម្រេច៖</strong> {loan.decisionNote}</span>}{loan.cancellationReason && <span className="block mt-1"><strong>មូលហេតុលុបចោល៖</strong> {loan.cancellationReason}</span>}</div>
  </div>;
}

function Info({ label, value, strong }) { return <div><div className="text-[11px] text-[#8A8FA3]">{label}</div><div className={`text-sm mt-0.5 ${strong ? "font-semibold text-[#1E2333]" : "text-[#5B5F73]"}`}>{value}</div></div>; }
function Input({ label, value, change, type="text" }) { return <label className="field">{label}<input type={type} min={type === "number" ? "0" : undefined} value={value} onChange={(e) => change(e.target.value)} className="control"/></label>; }
function Modal({ title, children, close, save, saving, error, saveLabel="រក្សាទុក", danger=false }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"><div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[90vh] sm:rounded-2xl sm:p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-[#1E2333]">{title}</h2><button type="button" onClick={close} disabled={saving} className="p-1"><X size={20}/></button></div>{children}{error && <p className="text-sm text-[#D9614F] mt-3">{error}</p>}<div className="flex gap-2 mt-5"><button type="button" onClick={close} disabled={saving} className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm disabled:opacity-50">បោះបង់</button><button type="button" onClick={save} disabled={saving} className={`flex-1 text-white rounded-xl py-2.5 text-sm font-semibold flex justify-center items-center gap-2 disabled:opacity-60 ${danger ? "bg-[#D9614F]" : "bg-[#2A3F8F]"}`}>{saving && <Loader2 size={16} className="animate-spin"/>}{saveLabel}</button></div></div></div>; }
