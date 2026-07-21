import React, { useState } from "react";
import { Shield, Users, UserCheck, UserX } from "lucide-react";
import { COLORS } from "../data/theme";
import { statusStyle } from "../data/mockData";
import { OrgHeader } from "../components/shared/OrgWidgets";

export default function UserRolesPage({ users, roles }) {
  const [tab, setTab] = useState("users");
  const activeUsers = users.filter((user) => user.status === "សកម្ម").length;

  return (
    <>
      <OrgHeader title="អ្នកប្រើប្រាស់ និងតួនាទី" sub="តួនាទីត្រូវបានគ្រប់គ្រងដោយ Admin script ដើម្បីការពារសិទ្ធិ Firebase" />
      <div className="mb-5 rounded-xl bg-[#EEF1FB] text-[#2A3F8F] px-4 py-3 text-xs leading-relaxed">
        ការបង្កើត ឬលុបគណនីពិត ត្រូវធ្វើតាម <span className="font-semibold">npm run provision-users</span> ដើម្បីបង្កើត Firebase Auth, Profile និង Role ក្នុងពេលតែមួយ។
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: "អ្នកប្រើប្រាស់សរុប", value: users.length, icon: Users, bg: COLORS.primaryLight, color: COLORS.primary },
          { label: "គណនីសកម្ម", value: activeUsers, icon: UserCheck, bg: COLORS.greenLight, color: COLORS.green },
          { label: "គណនីអសកម្ម", value: users.length - activeUsers, icon: UserX, bg: COLORS.redLight, color: COLORS.red },
        ].map(({ label, value, icon: Icon, bg, color }) => <div key={label} className="bg-white border border-[#EBEDF3] rounded-2xl px-5 py-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}><Icon size={18} color={color} /></div><div><div className="text-xs text-[#8A8FA3]">{label}</div><div className="text-xl font-bold text-[#1E2333]">{value}</div></div></div>)}
      </div>

      <div className="flex items-center gap-2 mb-5 bg-white rounded-xl border border-[#EBEDF3] p-1 w-fit">
        {[
          { key: "users", label: "អ្នកប្រើប្រាស់" },
          { key: "roles", label: "តួនាទី" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "text-white" : "text-[#5B5F73] hover:bg-[#F7F8FB]"
            }`}
            style={tab === t.key ? { background: COLORS.primary } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <div className="hidden md:block bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
          <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
                <th className="text-right font-medium px-5 py-3">អ្នកប្រើប្រាស់</th>
                <th className="text-right font-medium px-5 py-3">តួនាទី</th>
                <th className="text-right font-medium px-5 py-3">សាខា</th>
                <th className="text-right font-medium px-5 py-3">ស្ថានភាព</th>
                <th className="text-right font-medium px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#EBEDF3]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                        {u.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-[#1E2333]">{u.name}</div>
                        <div className="text-xs text-[#B4B7C6]" dir="ltr">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{u.role}</td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{u.branch}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1"
                      style={{ background: statusStyle[u.status]?.bg, color: statusStyle[u.status]?.fg }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-left" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${r.color}1A` }}>
                  <Shield size={20} color={r.color} />
                </div>
                <div className="font-semibold text-[#1E2333] text-sm">{r.name}</div>
              </div>
              <p className="text-xs text-[#5B5F73] leading-relaxed">{r.description}</p>
              <div className="text-xs text-[#8A8FA3] border-t border-[#EBEDF3] pt-3 flex justify-between"><span>{users.filter((u) => u.role === r.name).length} អ្នកប្រើប្រាស់</span><span className="font-medium text-[#2A3F8F]">សិទ្ធិកំណត់រួច</span></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
