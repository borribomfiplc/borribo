import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Shield, Users, UserCheck, UserX, Wrench } from "lucide-react";
import { COLORS } from "../data/theme";
import { OrgHeader } from "../components/shared/OrgWidgets";
import { auditLoginAccounts } from "../services/employees";

const ROLE_LABELS = {
  admin: "Admin",
  hr: "HR",
  employee: "Employee",
  kiosk: "Kiosk",
};

const ISSUE_LABELS = {
  "missing-email": "ខ្វះ Email",
  "auth-disabled": "Firebase Auth ត្រូវបានបិទ",
  "missing-profile": "ខ្វះ Profile",
  "profile-inactive": "Profile ត្រូវបានបិទ",
  "invalid-role": "Role មិនត្រឹមត្រូវ",
  "role-mismatch": "Role ក្នុង Auth និង Profile មិនត្រូវគ្នា",
  "missing-role-claim": "ខ្វះ Role Claim",
  "missing-employee-id": "ខ្វះ Employee ID",
  "missing-employee": "រកមិនឃើញ Employee",
  "employee-link-mismatch": "Employee link មិនត្រូវគ្នា",
  "employee-inactive": "បុគ្គលិកអសកម្ម",
  "missing-auth-account": "រកមិនឃើញ Firebase Auth Account",
  "missing-user-directory": "ខ្វះ User Directory",
  "missing-username": "ខ្វះ Username",
  "username-directory-mismatch": "Username Directory មិនត្រូវគ្នា",
  "password-reset-directory-mismatch": "Password Reset Directory មិនត្រូវគ្នា",
};

export default function UserRolesPage({ users, roles }) {
  const [tab, setTab] = useState("users");
  const [audit, setAudit] = useState(null);
  const [checking, setChecking] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditNotice, setAuditNotice] = useState("");

  const checkAccounts = async (repair = false) => {
    repair ? setRepairing(true) : setChecking(true);
    setAuditError("");
    setAuditNotice("");
    try {
      const result = await auditLoginAccounts(repair);
      setAudit(result);
      if (repair) {
        setAuditNotice(`បានពិនិត្យ និងជួសជុល Metadata ${result.repaired || 0} គណនី។ Password មិនត្រូវបានផ្លាស់ប្ដូរ។`);
      }
    } catch (error) {
      setAuditError(error?.message || "មិនអាចពិនិត្យ Login Account បានទេ");
    } finally {
      setChecking(false);
      setRepairing(false);
    }
  };

  useEffect(() => {
    checkAccounts(false);
  }, []);

  const auditRows = audit?.rows || [];
  const displayedUsers = auditRows.length
    ? auditRows
    : users.map((user) => ({
        ...user,
        ready: user.status === "សកម្ម",
        blockers: [],
        warnings: [],
        username: user.username || "",
      }));
  const summary = audit?.summary || {
    total: users.length,
    ready: users.filter((user) => user.status === "សកម្ម").length,
    blocked: users.filter((user) => user.status !== "សកម្ម").length,
    warnings: 0,
  };

  return (
    <>
      <OrgHeader title="អ្នកប្រើប្រាស់ និងតួនាទី" sub="ពិនិត្យ Firebase Auth, Profile, Role និង Employee link សម្រាប់គ្រប់ Login Account" />
      <div className="mb-5 rounded-xl bg-[#EEF1FB] text-[#2A3F8F] px-4 py-3 text-xs leading-relaxed flex flex-wrap items-center justify-between gap-3">
        <span>ការត្រួតពិនិត្យនេះមិនអាន ឬបង្ហាញ Password ទេ។ គណនី “អាច Login” មាន Auth, Profile, Role និង Employee link ត្រឹមត្រូវ។</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => checkAccounts(false)}
            disabled={checking || repairing}
            className="rounded-lg border border-[#BFC8ED] bg-white px-3 py-2 font-semibold flex items-center gap-1.5 disabled:opacity-60"
          >
            <RefreshCw size={14} className={checking ? "animate-spin" : ""} /> {checking ? "កំពុងពិនិត្យ..." : "ពិនិត្យឡើងវិញ"}
          </button>
          <button
            type="button"
            onClick={() => checkAccounts(true)}
            disabled={checking || repairing}
            className="rounded-lg bg-[#2A3F8F] px-3 py-2 text-white font-semibold flex items-center gap-1.5 disabled:opacity-60"
          >
            <Wrench size={14} /> {repairing ? "កំពុងជួសជុល..." : "ពិនិត្យ និងជួសជុល"}
          </button>
        </div>
      </div>

      {auditError && <div className="mb-5 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#B84637]">{auditError}</div>}
      {auditNotice && <div className="mb-5 rounded-xl bg-[#E9F7EF] px-4 py-3 text-sm text-[#257C4B]">{auditNotice}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Login Account សរុប", value: summary.total, icon: Users, bg: COLORS.primaryLight, color: COLORS.primary },
          { label: "អាច Login", value: summary.ready, icon: UserCheck, bg: COLORS.greenLight, color: COLORS.green },
          { label: "ត្រូវកែ", value: summary.blocked, icon: UserX, bg: COLORS.redLight, color: COLORS.red },
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
                <th className="text-right font-medium px-5 py-3">លទ្ធផល Login</th>
                <th className="text-right font-medium px-5 py-3">បញ្ហា</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map((u) => (
                <tr key={u.uid || u.id || u.email} className="border-t border-[#EBEDF3] align-top">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                        {(u.name || u.email || "?").slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-[#1E2333]">{u.name || "—"}</div>
                        <div className="text-xs text-[#B4B7C6]" dir="ltr">{u.email}</div>
                        {u.username && <div className="text-[11px] text-[#8A8FA3]" dir="ltr">@{u.username}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{ROLE_LABELS[u.role] || u.role || "—"}</td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{u.branch || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ${u.ready ? "bg-[#E9F7EF] text-[#257C4B]" : "bg-[#FBEBE8] text-[#B84637]"}`}>
                      {u.ready ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {u.ready ? "អាច Login" : "ត្រូវកែ"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#8A8FA3] max-w-[300px]">
                    {[...(u.blockers || []), ...(u.warnings || [])].length
                      ? [...(u.blockers || []), ...(u.warnings || [])].map((issue) => ISSUE_LABELS[issue] || issue).join(" · ")
                      : "គ្មានបញ្ហា"}
                  </td>
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
              <div className="text-xs text-[#8A8FA3] border-t border-[#EBEDF3] pt-3 flex justify-between"><span>{displayedUsers.filter((u) => u.role === r.name || u.role === r.id).length} អ្នកប្រើប្រាស់</span><span className="font-medium text-[#2A3F8F]">សិទ្ធិកំណត់រួច</span></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
