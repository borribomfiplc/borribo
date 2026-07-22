import React from "react";
import { ArrowLeft, Briefcase, CalendarDays, Mail, MapPin, Pencil, Phone, Shield, User } from "lucide-react";
import { COLORS } from "../data/theme";

function Item({ icon: Icon, label, value, dir }) {
  return <div className="flex gap-3 rounded-xl bg-[#F7F8FB] p-3.5"><Icon size={17} className="text-[#8A8FA3] shrink-0 mt-0.5" /><div className="min-w-0"><div className="text-[11px] text-[#8A8FA3]">{label}</div><div dir={dir} className="text-sm font-medium text-[#1E2333] mt-1 break-words">{value || "—"}</div></div></div>;
}

export default function EmployeeDetailsPage({ employee, onBack, onEdit }) {
  if (!employee) return null;
  return <>
    <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
      <div><button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#8A8FA3] hover:text-[#2A3F8F] mb-2"><ArrowLeft size={14} /> ត្រឡប់ទៅបញ្ជី</button><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ព័ត៌មានបុគ្គលិកលម្អិត</h1></div>
      <button onClick={() => onEdit(employee)} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-white text-sm font-semibold" style={{ background: COLORS.primary }}><Pencil size={15} /> កែសម្រួល</button>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
      <aside className="bg-white rounded-2xl border border-[#EBEDF3] p-5 text-center h-fit">
        {employee.photo ? <img src={employee.photo} alt={employee.name} className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-[#EEF1FB]" /> : <div className="w-28 h-28 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-4xl font-bold flex items-center justify-center mx-auto">{employee.name?.slice(0, 1)}</div>}
        <h2 className="font-bold text-[#1E2333] mt-4">{employee.name}</h2><p className="text-sm text-[#8A8FA3] mt-1">{employee.role}</p>
        <span className="inline-block mt-3 text-xs font-medium rounded-full px-3 py-1 bg-[#E9F7EF] text-[#3FA66B]">{employee.status}</span>
        <div className="border-t border-[#EBEDF3] mt-5 pt-4 text-xs text-[#8A8FA3]">លេខសម្គាល់<div className="text-base font-bold text-[#2A3F8F] mt-1" dir="ltr">{employee.id}</div></div>
      </aside>
      <div className="flex flex-col gap-5">
        <section className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5"><h3 className="font-semibold text-[#1E2333] mb-4 flex items-center gap-2"><User size={18} color={COLORS.primary} />ព័ត៌មានផ្ទាល់ខ្លួន</h3><div className="grid sm:grid-cols-2 gap-3"><Item icon={Phone} label="លេខទូរស័ព្ទ" value={employee.phone} dir="ltr" /><Item icon={Mail} label="អ៊ីមែល" value={employee.email} dir="ltr" /><Item icon={CalendarDays} label="ថ្ងៃខែឆ្នាំកំណើត" value={employee.dob} /><Item icon={User} label="ភេទ" value={employee.gender} /><div className="sm:col-span-2"><Item icon={MapPin} label="អាសយដ្ឋាន" value={employee.address} /></div></div></section>
        <section className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5"><h3 className="font-semibold text-[#1E2333] mb-4 flex items-center gap-2"><Briefcase size={18} color={COLORS.primary} />ព័ត៌មានការងារ</h3><div className="grid sm:grid-cols-2 gap-3"><Item icon={Briefcase} label="នាយកដ្ឋាន" value={employee.dept} /><Item icon={Briefcase} label="តួនាទី" value={employee.role} /><Item icon={MapPin} label="សាខា" value={employee.branch} /><Item icon={CalendarDays} label="ថ្ងៃចូលបម្រើការងារ" value={employee.startDate} /><Item icon={Briefcase} label="ប្រភេទការងារ" value={employee.employmentType} /><Item icon={CalendarDays} label="វេនការងារ" value={employee.shift} /></div></section>
        <section className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5"><h3 className="font-semibold text-[#1E2333] mb-3 flex items-center gap-2"><Shield size={18} color={COLORS.primary} />ស្ថានភាពគណនី</h3><p className="text-sm text-[#5B5F73]">{employee.uid ? `បានភ្ជាប់ Login Account (${employee.accountRole || "employee"})` : "មិនទាន់មាន Login Account"}</p></section>
      </div>
    </div>
  </>;
}
