import React, { useEffect, useState } from "react";
import { Search, ChevronDown, UserPlus, Archive, Pencil, Eye, Users, UserCheck, UserX } from "lucide-react";
import { COLORS } from "../data/theme";
import { statusStyle } from "../data/mockData";
import { usePagination } from "../hooks/usePagination";
import PaginationBar from "../components/shared/PaginationBar";
import { getEmployeeBackendStatus } from "../services/employees";

export default function EmployeeListPage({ onAddClick, onEditClick, onViewClick, onDeleteEmployee, employees, query, setQuery }) {
  const [branchFilter, setBranchFilter] = useState("ទាំងអស់");
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    let active = true;
    getEmployeeBackendStatus().then((result) => { if (active) setBackendError(result.ok ? "" : result.error); });
    return () => { active = false; };
  }, []);

  const branches = ["ទាំងអស់", ...Array.from(new Set(employees.map((e) => e.branch)))];

  const filtered = employees.filter((e) => {
    const matchesQuery =
      e.name.includes(query) || e.role.includes(query) || e.id.toLowerCase().includes(query.toLowerCase());
    const matchesBranch = branchFilter === "ទាំងអស់" || e.branch === branchFilter;
    return matchesQuery && matchesBranch;
  });

  const { page, setPage, totalPages, totalItems, pageSize, pageItems: paged } = usePagination(filtered);
  const activeEmployees = employees.filter((e) => e.status === "សកម្ម").length;
  const inactiveEmployees = employees.length - activeEmployees;

  const handleDelete = async (emp) => {
    if (!window.confirm(`តើអ្នកចង់ប្តូរ "${emp.name}" ទៅអសកម្ម និងរក្សាទុកទិន្នន័យចាស់មែនទេ?`)) return;
    setDeletingId(emp.id); setDeleteError("");
    try { await onDeleteEmployee(emp); }
    catch (error) { setDeleteError(error?.message || "មិនអាចដាក់បុគ្គលិកជាអសកម្មបានទេ"); }
    finally { setDeletingId(""); }
  };

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">បញ្ជីបុគ្គលិក</h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
            គ្រប់គ្រងព័ត៌មាន និងស្ថានភាពបុគ្គលិករបស់ស្ថាប័ន
          </p>
        </div>
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-4 py-2.5 whitespace-nowrap shadow-[0_8px_20px_rgba(42,63,143,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(42,63,143,0.28)]"
          style={{ background: `linear-gradient(135deg, ${COLORS.primary}, #4058B8)` }}
        >
          <UserPlus size={16} />
          បន្ថែមបុគ្គលិក
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-5">
        <div className="bg-white border border-[#EBEDF3] rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-2.5 sm:gap-3 shadow-[0_4px_16px_rgba(30,35,51,0.035)]">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EEF1FB] text-[#2A3F8F] flex items-center justify-center shrink-0"><Users size={18} /></div>
          <div className="min-w-0"><div className="text-base sm:text-xl font-bold text-[#1E2333] leading-none">{employees.length}</div><div className="text-[10px] sm:text-xs text-[#8A8FA3] mt-1 truncate">បុគ្គលិកសរុប</div></div>
        </div>
        <div className="bg-white border border-[#EBEDF3] rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-2.5 sm:gap-3 shadow-[0_4px_16px_rgba(30,35,51,0.035)]">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF8F0] text-[#2F9D62] flex items-center justify-center shrink-0"><UserCheck size={18} /></div>
          <div className="min-w-0"><div className="text-base sm:text-xl font-bold text-[#1E2333] leading-none">{activeEmployees}</div><div className="text-[10px] sm:text-xs text-[#8A8FA3] mt-1 truncate">កំពុងសកម្ម</div></div>
        </div>
        <div className="bg-white border border-[#EBEDF3] rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-2.5 sm:gap-3 shadow-[0_4px_16px_rgba(30,35,51,0.035)]">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF2EE] text-[#D9614F] flex items-center justify-center shrink-0"><UserX size={18} /></div>
          <div className="min-w-0"><div className="text-base sm:text-xl font-bold text-[#1E2333] leading-none">{inactiveEmployees}</div><div className="text-[10px] sm:text-xs text-[#8A8FA3] mt-1 truncate">អសកម្ម</div></div>
        </div>
      </div>

      {deleteError && <div className="text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-4 py-3 mb-5">{deleteError}</div>}
      {backendError && <div className="text-sm text-[#9A5B13] bg-[#FFF7ED] rounded-xl px-4 py-3 mb-5">Employee Worker មិនទាន់រួចរាល់៖ {backendError}។ មុខងារ Add/Edit/Account/Transfer នឹងត្រូវបានរារាំងរហូតដល់កំណត់រួច។</div>}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-4 mb-5 flex flex-col sm:flex-row gap-3 shadow-[0_4px_18px_rgba(30,35,51,0.035)]">
        <div className="flex-1 relative">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខសម្គាល់..."
            className="w-full bg-[#F7F8FB] border border-transparent rounded-xl pl-4 pr-10 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none transition focus:bg-white focus:border-[#2A3F8F]/25 focus:ring-4 focus:ring-[#2A3F8F]/10"
          />
        </div>
        <div className="relative">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="appearance-none bg-[#F7F8FB] border border-transparent rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none transition focus:bg-white focus:border-[#2A3F8F]/25 focus:ring-4 focus:ring-[#2A3F8F]/10 w-full sm:w-56"
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6] pointer-events-none" />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden shadow-[0_8px_30px_rgba(30,35,51,0.045)]">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed text-sm">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[19%]" />
            <col className="w-[18%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="bg-[#F7F8FB] text-[#747A90] text-xs border-b border-[#EBEDF3]">
              <th className="text-left font-semibold px-6 py-4 whitespace-nowrap">បុគ្គលិក</th>
              <th className="text-left font-semibold px-4 py-4 whitespace-nowrap">តួនាទី</th>
              <th className="text-left font-semibold px-4 py-4 whitespace-nowrap">សាខា</th>
              <th className="text-left font-semibold px-4 py-4 whitespace-nowrap">លេខទូរស័ព្ទ</th>
              <th className="text-center font-semibold px-3 py-4 whitespace-nowrap">ស្ថានភាព</th>
              <th className="text-center font-semibold px-3 py-4 whitespace-nowrap">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((e) => (
              <tr key={e.id} className="border-b border-[#F0F1F5] last:border-b-0 transition-colors hover:bg-[#F8F9FC] group">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3.5">
                    {e.photo ? <img src={e.photo} alt={e.name} className="w-11 h-11 rounded-xl object-cover shrink-0 ring-2 ring-white shadow-sm" /> : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#EEF1FB] to-[#E3E8F8] text-[#2A3F8F] text-sm font-bold flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm">{e.name.slice(0, 1)}</div>}
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1E2333] truncate">{e.name}</div>
                      <div className="text-[11px] text-[#A2A6B7] mt-0.5 tracking-wide">{e.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-left text-[#5B5F73] truncate">{e.role}</td>
                <td className="px-4 py-3.5 text-left text-[#5B5F73] truncate">{e.branch}</td>
                <td className="px-4 py-3.5 text-left text-[#5B5F73] whitespace-nowrap" dir="ltr">
                  {e.phone}
                </td>
                <td className="px-3 py-3.5 text-center">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1.5 whitespace-nowrap"
                    style={{ background: statusStyle[e.status].bg, color: statusStyle[e.status].fg }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                    {e.status}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={() => onViewClick(e)} title="មើលព័ត៌មានលម្អិត" aria-label={`មើលព័ត៌មានលម្អិតរបស់ ${e.name}`} className="w-9 h-9 rounded-xl border border-[#E5E8F0] bg-white flex items-center justify-center text-[#69708A] transition hover:border-[#C9D1F1] hover:bg-[#EEF1FB] hover:text-[#2A3F8F] hover:-translate-y-0.5"><Eye size={15} /></button>
                    <button onClick={() => onEditClick(e)} title="កែសម្រួលព័ត៌មាន" aria-label={`កែសម្រួលព័ត៌មានរបស់ ${e.name}`} className="w-9 h-9 rounded-xl border border-[#E5E8F0] bg-white flex items-center justify-center text-[#69708A] transition hover:border-[#C9D1F1] hover:bg-[#EEF1FB] hover:text-[#2A3F8F] hover:-translate-y-0.5"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(e)} disabled={deletingId === e.id} title="ដាក់បុគ្គលិកអសកម្ម" aria-label={`ដាក់ ${e.name} ជាអសកម្ម`} className="w-9 h-9 rounded-xl border border-[#E5E8F0] bg-white flex items-center justify-center text-[#69708A] transition hover:border-[#F2C9C2] hover:bg-[#FFF2EE] hover:text-[#D9614F] hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"><Archive size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[#8A8FA3] text-sm py-14">
                  <div className="w-12 h-12 rounded-2xl bg-[#F2F4F9] text-[#A2A6B7] flex items-center justify-center mx-auto mb-3"><Users size={22} /></div>
                  រកមិនឃើញបុគ្គលិកដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរក
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {paged.map((e) => (
          <div key={e.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-4 shadow-[0_5px_20px_rgba(30,35,51,0.04)]">
            <div className="flex items-center gap-3 mb-3">
              {e.photo ? <img src={e.photo} alt={e.name} className="w-10 h-10 rounded-full object-cover shrink-0" /> : <div className="w-10 h-10 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-sm font-bold flex items-center justify-center shrink-0">{e.name.slice(0, 1)}</div>}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1E2333] text-sm truncate">{e.name}</div>
                <div className="text-xs text-[#8A8FA3] truncate">{e.role}</div>
              </div>
              <span
                className="text-[11px] font-medium rounded-full px-2.5 py-1 shrink-0"
                style={{ background: statusStyle[e.status].bg, color: statusStyle[e.status].fg }}
              >
                {e.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#8A8FA3] border-t border-[#EBEDF3] pt-3 mb-3">
              <span>{e.branch}</span>
              <span dir="ltr">{e.phone}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => onViewClick(e)} className="flex-1 flex items-center justify-center gap-1.5 border border-[#DDE2F1] bg-[#F8F9FC] rounded-xl py-2.5 text-xs font-medium text-[#2A3F8F]"><Eye size={14} /> មើល</button>
              <button
                onClick={() => onEditClick(e)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-[#DDE2F1] bg-[#F8F9FC] rounded-xl py-2.5 text-xs font-medium text-[#5B5F73]"
              >
                <Pencil size={14} /> កែ
              </button>
              <button
                onClick={() => handleDelete(e)}
                disabled={deletingId === e.id}
                className="flex-1 flex items-center justify-center gap-1.5 border border-[#F0D8D3] bg-[#FFF8F6] rounded-xl py-2.5 text-xs font-medium text-[#D9614F] disabled:opacity-50"
              >
                <Archive size={14} /> អសកម្ម
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-[#8A8FA3] text-sm py-10 bg-white rounded-2xl border border-[#EBEDF3]">
            រកមិនឃើញបុគ្គលិកដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរក
          </div>
        )}
      </div>
      <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
    </>
  );
}
