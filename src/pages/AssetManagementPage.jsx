import React, { useMemo, useState } from "react";
import {
  ArrowRightLeft, Calculator, CheckCircle2, ChevronDown, ChevronUp, History,
  Loader2, Package, Pencil, Plus, RotateCcw, Send, Wrench, X,
} from "lucide-react";
import StatCard from "../components/shared/StatCard";
import { COLORS } from "../data/theme";
import {
  createAsset, recordAssetMaintenance, reviewAsset, submitAsset, transferAsset, updateAsset,
} from "../services/operations";

const statuses = ["កំពុងប្រើ", "នៅស្តុក", "ជួសជុល", "បាត់/លុបចេញ"];
const today = () => new Date().toISOString().slice(0, 10);
const emptyAsset = () => ({
  assetCode: "", name: "", category: "កុំព្យូទ័រ", assignedTo: "",
  status: "នៅស្តុក", purchaseDate: "", value: "", usefulLifeYears: "",
  salvageValue: "0", serialNumber: "", note: "", approvalStatus: "រង់ចាំអនុម័ត",
});
const emptyTransfer = () => ({ toEmployeeId: "", date: today(), note: "" });
const emptyMaintenance = () => ({ date: today(), type: "ការជួសជុលទូទៅ", cost: "", vendor: "", status: "កំពុងជួសជុល", note: "" });

function assetApproval(asset) { return asset.approvalStatus || "បានអនុម័ត"; }
function statusClass(status) {
  if (status === "កំពុងប្រើ") return "bg-[#E9F7EF] text-[#3FA66B]";
  if (status === "ជួសជុល") return "bg-[#FDF3E3] text-[#B97816]";
  if (status === "បាត់/លុបចេញ") return "bg-[#FBEBE8] text-[#D9614F]";
  return "bg-[#EEF1FB] text-[#2A3F8F]";
}
function approvalClass(status) {
  if (status === "បានអនុម័ត") return "bg-[#E9F7EF] text-[#3FA66B]";
  if (status === "រង់ចាំអនុម័ត") return "bg-[#FDF3E3] text-[#B97816]";
  if (status === "ត្រូវកែប្រែ") return "bg-[#FBEBE8] text-[#D9614F]";
  return "bg-[#EEF1FB] text-[#2A3F8F]";
}
function assetBookValue(asset, at = new Date()) {
  const value = Number(asset.value || 0);
  const salvage = Math.min(value, Number(asset.salvageValue || 0));
  const life = Number(asset.usefulLifeYears || 0);
  if (!asset.purchaseDate || life <= 0 || value <= 0) return value;
  const purchased = new Date(`${asset.purchaseDate}T00:00:00`);
  if (Number.isNaN(purchased.getTime()) || purchased >= at) return value;
  const years = Math.max(0, (at.getTime() - purchased.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const depreciation = Math.min(value - salvage, (value - salvage) * years / life);
  return Math.max(salvage, Math.round((value - depreciation) * 100) / 100);
}

export default function AssetManagementPage({ employees = [], assets = [] }) {
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyAsset);
  const [transfer, setTransfer] = useState(emptyTransfer);
  const [maintenance, setMaintenance] = useState(emptyMaintenance);
  const [reviewComment, setReviewComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState("");

  const summary = useMemo(() => ({
    totalValue: assets.reduce((sum, item) => sum + Number(item.value || 0), 0),
    bookValue: assets.reduce((sum, item) => sum + assetBookValue(item), 0),
    maintenanceCost: assets.reduce((sum, item) => sum + Number(item.totalMaintenanceCost || 0), 0),
    pending: assets.filter((item) => assetApproval(item) === "រង់ចាំអនុម័ត").length,
  }), [assets]);

  const openCreate = () => { setSelected(null); setForm(emptyAsset()); setError(""); setModal("create"); };
  const openEdit = (asset) => {
    setSelected(asset);
    setForm({
      assetCode: asset.assetCode || "", name: asset.name || "", category: asset.category || "",
      assignedTo: asset.assignedTo || "", status: asset.status || "នៅស្តុក", purchaseDate: asset.purchaseDate || "",
      value: String(asset.value || ""), usefulLifeYears: String(asset.usefulLifeYears || ""),
      salvageValue: String(asset.salvageValue || 0), serialNumber: asset.serialNumber || "", note: asset.note || "",
      approvalStatus: assetApproval(asset),
    });
    setError(""); setModal("edit");
  };
  const openTransfer = (asset) => { setSelected(asset); setTransfer(emptyTransfer()); setError(""); setModal("transfer"); };
  const openMaintenance = (asset) => { setSelected(asset); setMaintenance(emptyMaintenance()); setError(""); setModal("maintenance"); };
  const openReview = (asset, type) => { setSelected(asset); setReviewComment(""); setError(""); setModal(type); };
  const close = () => { if (!saving) { setModal(null); setSelected(null); setError(""); } };
  const run = async (task) => {
    setSaving(true); setError("");
    try { await task(); setModal(null); setSelected(null); }
    catch (err) { setError(err.message || "មិនអាចរក្សាទុកបានទេ"); }
    finally { setSaving(false); }
  };

  const saveAsset = () => run(async () => {
    const value = Number(form.value || 0);
    const salvageValue = Number(form.salvageValue || 0);
    if (!form.assetCode.trim() || !form.name.trim()) throw new Error("សូមបំពេញលេខកូដ និងឈ្មោះទ្រព្យសម្បត្តិ");
    if (salvageValue > value) throw new Error("តម្លៃសំណល់មិនអាចធំជាងតម្លៃទិញទេ");
    const payload = {
      assetCode: form.assetCode, name: form.name, category: form.category, status: form.status,
      purchaseDate: form.purchaseDate, value, usefulLifeYears: Number(form.usefulLifeYears || 0),
      salvageValue, serialNumber: form.serialNumber, note: form.note,
    };
    if (modal === "create") await createAsset({ ...payload, assignedTo: form.assignedTo, approvalStatus: form.approvalStatus });
    else await updateAsset(selected.assetId, payload);
  });
  const saveTransfer = () => run(async () => {
    if (transfer.toEmployeeId === (selected?.assignedTo || "")) throw new Error("ទ្រព្យសម្បត្តិនេះបានប្រគល់ឱ្យបុគ្គលិកនេះរួចហើយ");
    await transferAsset(selected.assetId, transfer);
  });
  const saveMaintenance = () => run(async () => {
    if (!maintenance.type.trim()) throw new Error("សូមបំពេញប្រភេទការជួសជុល");
    await recordAssetMaintenance(selected.assetId, { ...maintenance, cost: Number(maintenance.cost || 0) });
  });
  const submit = (asset) => run(() => submitAsset(asset.assetId));
  const review = (decision) => run(async () => {
    if (decision === "return" && !reviewComment.trim()) throw new Error("សូមបញ្ចូលមូលហេតុឱ្យកែប្រែ");
    await reviewAsset(selected.assetId, decision, reviewComment);
  });

  return <>
    <div className="flex items-start justify-between mb-5 sm:mb-6 gap-3 flex-wrap">
      <div><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">គ្រប់គ្រងទ្រព្យសម្បត្តិ</h1><p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">Approval, depreciation, transfer និង maintenance history</p></div>
      <button onClick={openCreate} className="flex items-center gap-2 bg-[#2A3F8F] text-white text-sm font-semibold rounded-xl px-4 py-2.5"><Plus size={16}/>បន្ថែមទ្រព្យសម្បត្តិ</button>
    </div>
    {error && !modal && <div className="mb-4 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#D9614F]">{error}</div>}

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard icon={Package} label="ទ្រព្យសម្បត្តិសរុប" value={assets.length} sub={`${summary.pending} រង់ចាំអនុម័ត`} iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary}/>
      <StatCard icon={Package} label="តម្លៃទិញសរុប" value={`${summary.totalValue.toLocaleString()} $`} sub="Acquisition cost" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green}/>
      <StatCard icon={Calculator} label="តម្លៃសៀវភៅបច្ចុប្បន្ន" value={`${Math.round(summary.bookValue).toLocaleString()} $`} sub="Straight-line depreciation" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent}/>
      <StatCard icon={Wrench} label="ចំណាយជួសជុល" value={`${summary.maintenanceCost.toLocaleString()} $`} sub="ចំណាយដែលបានកត់ត្រា" iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary}/>
    </div>

    <div className="space-y-3">
      {assets.map((asset) => {
        const isOpen = expanded === asset.assetId;
        const approval = assetApproval(asset);
        const approved = approval === "បានអនុម័ត";
        return <div key={asset.assetId} className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-4">
            <button type="button" onClick={() => setExpanded(isOpen ? "" : asset.assetId)} className="flex-1 text-left grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3 items-center">
              <div className="col-span-2 sm:col-span-1"><div className="font-semibold text-[#1E2333]">{asset.name}</div><div className="text-xs text-[#8A8FA3]">{asset.assetCode}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</div></div>
              <Info label="ប្រភេទ" value={asset.category || "—"}/>
              <Info label="អ្នកទទួលខុសត្រូវ" value={asset.assignedToName || "នៅស្តុក"}/>
              <Info label="តម្លៃទិញ" value={`${Number(asset.value || 0).toLocaleString()} $`}/>
              <Info label="តម្លៃសៀវភៅ" value={`${assetBookValue(asset).toLocaleString()} $`}/>
              <div><div className="text-[11px] text-[#8A8FA3] mb-1">ប្រើប្រាស់</div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(asset.status || "នៅស្តុក")}`}>{asset.status || "នៅស្តុក"}</span></div>
              <div><div className="text-[11px] text-[#8A8FA3] mb-1">អនុម័ត</div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${approvalClass(approval)}`}>{approval}</span></div>
            </button>
            <div className="flex items-center flex-wrap gap-1.5 xl:justify-end">
              {approval !== "រង់ចាំអនុម័ត" && <button onClick={() => openEdit(asset)} className="asset-action"><Pencil size={15}/>កែប្រែ</button>}
              {["ព្រាង", "ត្រូវកែប្រែ"].includes(approval) && <button onClick={() => submit(asset)} disabled={saving} className="asset-action text-[#2A3F8F]"><Send size={15}/>ដាក់ស្នើ</button>}
              {approval === "រង់ចាំអនុម័ត" && <><button onClick={() => openReview(asset, "approve")} className="asset-action text-[#3FA66B]"><CheckCircle2 size={15}/>អនុម័ត</button><button onClick={() => openReview(asset, "return")} className="asset-action text-[#D9614F]"><RotateCcw size={15}/>ឱ្យកែប្រែ</button></>}
              {approved && asset.status !== "បាត់/លុបចេញ" && <><button onClick={() => openTransfer(asset)} className="asset-action text-[#2A3F8F]"><ArrowRightLeft size={15}/>ផ្ទេរ</button><button onClick={() => openMaintenance(asset)} className="asset-action text-[#B97816]"><Wrench size={15}/>ជួសជុល</button></>}
              <button onClick={() => setExpanded(isOpen ? "" : asset.assetId)} className="p-2 rounded-lg hover:bg-[#F5F6FA]">{isOpen ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}</button>
            </div>
          </div>
          {isOpen && <AssetDetails asset={asset}/>}
        </div>;
      })}
      {!assets.length && <div className="bg-white rounded-2xl border border-[#EBEDF3] text-center py-14 text-[#8A8FA3]">មិនទាន់មានទ្រព្យសម្បត្តិទេ។</div>}
    </div>

    {(modal === "create" || modal === "edit") && <Modal title={modal === "create" ? "បន្ថែមទ្រព្យសម្បត្តិ" : "កែប្រែទ្រព្យសម្បត្តិ"} close={close} save={saveAsset} saving={saving} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="លេខកូដ *" value={form.assetCode} change={(value) => setForm({...form, assetCode:value})} placeholder="AST-001"/>
        <Input label="ឈ្មោះ *" value={form.name} change={(value) => setForm({...form, name:value})}/>
        <Input label="ប្រភេទ" value={form.category} change={(value) => setForm({...form, category:value})}/>
        {modal === "edit" ? <label className="asset-field">ស្ថានភាពប្រើប្រាស់<select value={form.status} onChange={(event) => setForm({...form, status:event.target.value})} className="asset-control">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label> : <label className="asset-field">ប្រគល់ដំបូងឱ្យ<select value={form.assignedTo} onChange={(event) => setForm({...form, assignedTo:event.target.value})} className="asset-control"><option value="">នៅស្តុក</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}
        <Input label="តម្លៃទិញ (USD)" type="number" value={form.value} change={(value) => setForm({...form, value})}/>
        <Input label="ថ្ងៃទិញ" type="date" value={form.purchaseDate} change={(value) => setForm({...form, purchaseDate:value})}/>
        <Input label="អាយុកាលប្រើប្រាស់ (ឆ្នាំ)" type="number" value={form.usefulLifeYears} change={(value) => setForm({...form, usefulLifeYears:value})}/>
        <Input label="តម្លៃសំណល់ (USD)" type="number" value={form.salvageValue} change={(value) => setForm({...form, salvageValue:value})}/>
        <Input label="Serial Number" value={form.serialNumber} change={(value) => setForm({...form, serialNumber:value})}/>
        {modal === "create" && <label className="asset-field">រក្សាទុកជា<select value={form.approvalStatus} onChange={(event) => setForm({...form, approvalStatus:event.target.value})} className="asset-control"><option value="ព្រាង">ព្រាង</option><option value="រង់ចាំអនុម័ត">ដាក់ស្នើភ្លាម</option></select></label>}
        <label className="asset-field sm:col-span-2">កំណត់ចំណាំ<textarea rows="3" value={form.note} onChange={(event) => setForm({...form, note:event.target.value})} className="asset-control resize-none"/></label>
      </div>
      {modal === "edit" && form.status === "នៅស្តុក" && selected?.assignedTo && <p className="text-xs text-[#D9614F] mt-3">សូមប្រើប៊ូតុង “ផ្ទេរ” ដើម្បីប្រគល់ចូលស្តុកជាមុន។</p>}
      {modal === "edit" && assetApproval(selected || {}) === "បានអនុម័ត" && <p className="text-xs text-[#8A8FA3] mt-3">ការកែតម្លៃទិញ អាយុកាល ឬតម្លៃសំណល់ នឹងដាក់ record សម្រាប់អនុម័តឡើងវិញដោយស្វ័យប្រវត្តិ។</p>}
    </Modal>}

    {modal === "transfer" && <Modal title="ផ្ទេរទ្រព្យសម្បត្តិ" close={close} save={saveTransfer} saving={saving} error={error} saveLabel="រក្សាទុកការផ្ទេរ">
      <div className="rounded-xl bg-[#F7F8FB] p-3 mb-3 text-sm">ពី៖ <strong>{selected?.assignedToName || "នៅស្តុក"}</strong></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="asset-field sm:col-span-2">ផ្ទេរទៅ<select value={transfer.toEmployeeId} onChange={(event) => setTransfer({...transfer, toEmployeeId:event.target.value})} className="asset-control"><option value="">ប្រគល់ចូលស្តុក</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.branch || ""}</option>)}</select></label><Input label="ថ្ងៃផ្ទេរ" type="date" value={transfer.date} change={(value) => setTransfer({...transfer, date:value})}/><label className="asset-field sm:col-span-2">កំណត់ចំណាំ<textarea rows="3" value={transfer.note} onChange={(event) => setTransfer({...transfer, note:event.target.value})} className="asset-control resize-none"/></label></div>
    </Modal>}

    {modal === "maintenance" && <Modal title="កត់ត្រាការជួសជុល" close={close} save={saveMaintenance} saving={saving} error={error} saveLabel="រក្សាទុកការជួសជុល">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Input label="ថ្ងៃជួសជុល" type="date" value={maintenance.date} change={(value) => setMaintenance({...maintenance, date:value})}/><Input label="ប្រភេទការជួសជុល *" value={maintenance.type} change={(value) => setMaintenance({...maintenance, type:value})}/><Input label="ចំណាយ (USD)" type="number" value={maintenance.cost} change={(value) => setMaintenance({...maintenance, cost:value})}/><Input label="អ្នកផ្គត់ផ្គង់/ហាង" value={maintenance.vendor} change={(value) => setMaintenance({...maintenance, vendor:value})}/><label className="asset-field">ស្ថានភាព<select value={maintenance.status} onChange={(event) => setMaintenance({...maintenance, status:event.target.value})} className="asset-control"><option>កំពុងជួសជុល</option><option>រួចរាល់</option></select></label><label className="asset-field sm:col-span-2">កំណត់ចំណាំ<textarea rows="3" value={maintenance.note} onChange={(event) => setMaintenance({...maintenance, note:event.target.value})} className="asset-control resize-none"/></label></div>
    </Modal>}

    {(modal === "approve" || modal === "return") && <Modal title={modal === "approve" ? "អនុម័តទ្រព្យសម្បត្តិ" : "បញ្ជូនឱ្យកែប្រែ"} close={close} save={() => review(modal === "approve" ? "approve" : "return")} saving={saving} error={error} saveLabel={modal === "approve" ? "អនុម័ត" : "បញ្ជូនឱ្យកែប្រែ"} danger={modal === "return"}>
      <div className="rounded-xl bg-[#F7F8FB] p-3 mb-3 text-sm"><strong>{selected?.name}</strong><span className="block text-xs text-[#8A8FA3] mt-1">{selected?.assetCode} · {Number(selected?.value || 0).toLocaleString()} $</span></div>
      <label className="asset-field">មតិយោបល់{modal === "return" ? " *" : ""}<textarea rows="4" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} className="asset-control resize-none"/></label>
    </Modal>}

    <style>{`.asset-field{font-size:12px;color:#5B5F73;display:block}.asset-control{margin-top:4px;width:100%;background:#F5F6FA;border-radius:12px;padding:10px 12px;font-size:14px;outline:none}.asset-action{display:inline-flex;align-items:center;gap:5px;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:600;background:#F7F8FB}.asset-action:hover{background:#EEF1FB}`}</style>
  </>;
}

function AssetDetails({ asset }) {
  const assignments = [...(Array.isArray(asset.assignmentHistory) ? asset.assignmentHistory : [])].reverse();
  const maintenance = [...(Array.isArray(asset.maintenanceHistory) ? asset.maintenanceHistory : [])].reverse();
  const history = [...(Array.isArray(asset.history) ? asset.history : [])].reverse();
  return <div className="border-t border-[#EBEDF3] bg-[#FAFBFD] p-4 sm:p-5 grid grid-cols-1 xl:grid-cols-3 gap-5">
    <div><h3 className="font-semibold text-sm text-[#1E2333] flex items-center gap-2 mb-3"><Calculator size={16}/>Depreciation</h3><div className="bg-white border border-[#EBEDF3] rounded-xl p-3 grid grid-cols-2 gap-3"><Info label="តម្លៃទិញ" value={`${Number(asset.value || 0).toLocaleString()} $`}/><Info label="តម្លៃសៀវភៅ" value={`${assetBookValue(asset).toLocaleString()} $`}/><Info label="អាយុកាល" value={Number(asset.usefulLifeYears || 0) > 0 ? `${asset.usefulLifeYears} ឆ្នាំ` : "មិនបានកំណត់"}/><Info label="រំលស់/ឆ្នាំ" value={`${Number(asset.annualDepreciation || 0).toLocaleString()} $`}/><Info label="តម្លៃសំណល់" value={`${Number(asset.salvageValue || 0).toLocaleString()} $`}/><Info label="វិធីសាស្ត្រ" value={asset.depreciationMethod === "straight-line" ? "Straight-line" : "មិនគិតរំលស់"}/></div>{asset.managerComment && <p className="text-xs text-[#5B5F73] mt-2"><strong>មតិអ្នកអនុម័ត៖</strong> {asset.managerComment}</p>}</div>
    <HistoryList icon={ArrowRightLeft} title="ប្រវត្តិផ្ទេរ" empty="មិនទាន់មានការផ្ទេរ។" items={assignments.map((item) => ({ id:item.transferId, title:`${item.fromEmployeeName || "ស្តុក"} → ${item.toEmployeeName || "ស្តុក"}`, meta:`${item.date || "—"} · ${item.recordedByEmail || "—"}`, detail:item.note }))}/>
    <HistoryList icon={Wrench} title="ប្រវត្តិជួសជុល" empty="មិនទាន់មានការជួសជុល។" items={maintenance.map((item) => ({ id:item.maintenanceId, title:`${item.type} · ${Number(item.cost || 0).toLocaleString()} $`, meta:`${item.date || "—"} · ${item.status || ""}`, detail:item.vendor || item.note }))}/>
    <div className="xl:col-span-3"><HistoryList icon={History} title="Audit history" empty="Legacy record — មិនទាន់មាន audit history។" items={history.map((item) => ({ id:item.id, title:item.label, meta:`${String(item.at || "").slice(0,16).replace("T"," ")} · ${item.actorEmail || "—"}` }))}/></div>
    {asset.note && <div className="xl:col-span-3 text-sm text-[#5B5F73]"><strong>កំណត់ចំណាំ៖</strong> {asset.note}</div>}
  </div>;
}
function HistoryList({ icon:Icon, title, items, empty }) { return <div><h3 className="font-semibold text-sm text-[#1E2333] flex items-center gap-2 mb-3"><Icon size={16}/>{title}</h3><div className="space-y-2">{items.map((item) => <div key={item.id} className="bg-white border border-[#EBEDF3] rounded-xl p-3 text-sm"><div className="font-medium">{item.title}</div><div className="text-xs text-[#8A8FA3] mt-1">{item.meta}</div>{item.detail && <div className="text-xs text-[#5B5F73] mt-1">{item.detail}</div>}</div>)}{!items.length && <p className="text-xs text-[#8A8FA3]">{empty}</p>}</div></div>; }
function Info({ label, value }) { return <div><div className="text-[11px] text-[#8A8FA3]">{label}</div><div className="text-sm text-[#5B5F73] mt-0.5">{value}</div></div>; }
function Input({ label, value, change, type="text", placeholder }) { return <label className="asset-field">{label}<input type={type} min={type === "number" ? "0" : undefined} value={value} onChange={(event) => change(event.target.value)} placeholder={placeholder} className="asset-control"/></label>; }
function Modal({ title, children, close, save, saving, error, saveLabel="រក្សាទុក", danger=false }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"><div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[90vh] sm:rounded-2xl sm:p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-[#1E2333]">{title}</h2><button onClick={close} disabled={saving}><X size={20}/></button></div>{children}{error && <p className="text-sm text-[#D9614F] mt-3">{error}</p>}<div className="flex gap-2 mt-5"><button onClick={close} disabled={saving} className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm disabled:opacity-50">បោះបង់</button><button onClick={save} disabled={saving} className={`flex-1 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${danger ? "bg-[#D9614F]" : "bg-[#2A3F8F]"}`}>{saving && <Loader2 size={16} className="animate-spin"/>}{saveLabel}</button></div></div></div>; }
