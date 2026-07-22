import React, { useState } from "react";
import { Search, ChevronDown, UserPlus, X, Pencil, Eye } from "lucide-react";
import { COLORS } from "../data/theme";
import { statusStyle } from "../data/mockData";
import { usePagination } from "../hooks/usePagination";
import PaginationBar from "../components/shared/PaginationBar";

export default function EmployeeListPage({ onAddClick, onEditClick, onViewClick, onDeleteEmployee, employees, query, setQuery }) {
  const [branchFilter, setBranchFilter] = useState("ទាំងអស់");
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const branches = ["ទាំងអស់", ...Array.from(new Set(employees.map((e) => e.branch)))];

  const filtered = employees.filter((e) => {
    const matchesQuery =
      e.name.includes(query) || e.role.includes(query) || e.id.toLowerCase().includes(query.toLowerCase());
    const matchesBranch = branchFilter === "ទាំងអស់" || e.branch === branchFilter;
    return matchesQuery && matchesBranch;
  });

  const { page, setPage, totalPages, totalItems, pageSize, pageItems: paged } = usePagination(filtered);

  const handleDelete = async (emp) => {
    const action = emp.uid ? "បិទ Login Account និងដកចេញពីបញ្ជី" : "លុបចេញពីបញ្ជី";
    if (!window.confirm(`តើអ្នកចង់${action}សម្រាប់ "${emp.name}" មែនទេ?`)) return;
    setDeletingId(emp.id); setDeleteError("");
    try { await onDeleteEmployee(emp); }
    catch (error) { setDeleteError(error?.message || "មិនអាចលុបបុគ្គលិកបានទេ"); }
    finally { setDeletingId(""); }
  };

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">បញ្ជីបុគ្គលិក</h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
            មានបុគ្គលិកសរុប {employees.length} នាក់ · {employees.filter((e) => e.status === "សកម្ម").length} កំពុងសកម្ម
          </p>
        </div>
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap"
          style={{ background: COLORS.primary }}
        >
          <UserPlus size={16} />
          បន្ថែមបុគ្គលិក
        </button>
      </div>

      {deleteError && <div className="text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-4 py-3 mb-5">{deleteError}</div>}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខសម្គាល់..."
            className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-10 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
          />
        </div>
        <div className="relative">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 w-full sm:w-56"
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
      <div className="hidden md:block bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed text-sm">
          <colgroup>
            <col className="w-[27%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead>
            <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-left font-medium px-5 py-3 whitespace-nowrap">បុគ្គលិក</th>
              <th className="text-left font-medium px-5 py-3 whitespace-nowrap">តួនាទី</th>
              <th className="text-left font-medium px-5 py-3 whitespace-nowrap">សាខា</th>
              <th className="text-left font-medium px-5 py-3 whitespace-nowrap">លេខទូរស័ព្ទ</th>
              <th className="text-left font-medium px-5 py-3 whitespace-nowrap">ស្ថានភាព</th>
              <th className="text-right font-medium px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((e) => (
              <tr key={e.id} className="border-t border-[#EBEDF3] hover:bg-[#F7F8FB]/60">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {e.photo ? <img src={e.photo} alt={e.name} className="w-9 h-9 rounded-full object-cover shrink-0" /> : <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">{e.name.slice(0, 1)}</div>}
                    <div>
                      <div className="font-medium text-[#1E2333]">{e.name}</div>
                      <div className="text-xs text-[#B4B7C6]">{e.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[#5B5F73] truncate">{e.role}</td>
                <td className="px-5 py-3.5 text-[#5B5F73] truncate">{e.branch}</td>
                <td className="px-5 py-3.5 text-[#5B5F73] whitespace-nowrap" dir="ltr">
                  {e.phone}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className="text-xs font-medium rounded-full px-2.5 py-1"
                    style={{ background: statusStyle[e.status].bg, color: statusStyle[e.status].fg }}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-left">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onViewClick(e)} aria-label={`មើល ${e.name}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] hover:text-[#2A3F8F]"><Eye size={15} /></button>
                    <button
                      onClick={() => onEditClick(e)}
                      aria-label={`កែសម្រួល ${e.name}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] hover:text-[#2A3F8F]"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(e)}
                      disabled={deletingId === e.id}
                      aria-label={`លុប ${e.name}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#FBEBE8] hover:text-[#D9614F]"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[#8A8FA3] text-sm py-10">
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
          <div key={e.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-4">
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
            <div className="flex items-center gap-2">
              <button onClick={() => onViewClick(e)} className="flex-1 flex items-center justify-center gap-1.5 border border-[#EBEDF3] rounded-lg py-2 text-xs font-medium text-[#2A3F8F]"><Eye size={13} /> មើល</button>
              <button
                onClick={() => onEditClick(e)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-[#EBEDF3] rounded-lg py-2 text-xs font-medium text-[#5B5F73]"
              >
                <Pencil size={13} /> កែសម្រួល
              </button>
              <button
                onClick={() => handleDelete(e)}
                disabled={deletingId === e.id}
                className="flex-1 flex items-center justify-center gap-1.5 border border-[#EBEDF3] rounded-lg py-2 text-xs font-medium text-[#D9614F]"
              >
                <X size={13} /> លុប
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
