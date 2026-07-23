import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Mail,
  RefreshCw,
  Shield,
  UserCheck,
  UserRound,
  Users,
  UserX,
  Wrench,
} from "lucide-react";
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

const getIssues = (user) => [...(user.blockers || []), ...(user.warnings || [])];
const getIssueText = (user) => {
  const issues = getIssues(user);
  return issues.length ? issues.map((issue) => ISSUE_LABELS[issue] || issue).join(" · ") : "គ្មានបញ្ហា";
};

function LoginStatus({ ready }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? "bg-[#E9F7EF] text-[#257C4B]" : "bg-[#FBEBE8] text-[#B84637]"}`}>
      {ready ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {ready ? "អាច Login" : "ត្រូវកែ"}
    </span>
  );
}

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

      <div className="mb-5 rounded-xl bg-[#EEF1FB] px-4 py-3 text-xs leading-relaxed text-[#2A3F8F]">
        <p>ការត្រួតពិនិត្យនេះមិនអាន ឬបង្ហាញ Password ទេ។ គណនី “អាច Login” មាន Auth, Profile, Role និង Employee link ត្រឹមត្រូវ។</p>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => checkAccounts(false)}
            disabled={checking || repairing}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#BFC8ED] bg-white px-3 py-2 font-semibold disabled:opacity-60"
          >
            <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
            {checking ? "កំពុងពិនិត្យ..." : "ពិនិត្យឡើងវិញ"}
          </button>
          <button
            type="button"
            onClick={() => checkAccounts(true)}
            disabled={checking || repairing}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#2A3F8F] px-3 py-2 font-semibold text-white disabled:opacity-60"
          >
            <Wrench size={14} />
            {repairing ? "កំពុងជួសជុល..." : "ពិនិត្យ និងជួសជុល"}
          </button>
        </div>
      </div>

      {auditError && <div className="mb-5 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#B84637]">{auditError}</div>}
      {auditNotice && <div className="mb-5 rounded-xl bg-[#E9F7EF] px-4 py-3 text-sm text-[#257C4B]">{auditNotice}</div>}

      <div className="mb-5 grid grid-cols-1 gap-3 min-[380px]:grid-cols-3">
        {[
          { label: "Login Account សរុប", value: summary.total, icon: Users, bg: COLORS.primaryLight, color: COLORS.primary },
          { label: "អាច Login", value: summary.ready, icon: UserCheck, bg: COLORS.greenLight, color: COLORS.green },
          { label: "ត្រូវកែ", value: summary.blocked, icon: UserX, bg: COLORS.redLight, color: COLORS.red },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#EBEDF3] bg-white px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: bg }}>
              <Icon size={18} color={color} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] leading-tight text-[#8A8FA3] sm:text-xs">{label}</div>
              <div className="text-xl font-bold text-[#1E2333]">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid w-full grid-cols-2 gap-1 rounded-xl border border-[#EBEDF3] bg-white p-1 sm:w-fit">
        {[
          { key: "users", label: "អ្នកប្រើប្រាស់" },
          { key: "roles", label: "តួនាទី" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`min-h-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === item.key ? "text-white" : "text-[#5B5F73] hover:bg-[#F7F8FB]"}`}
            style={tab === item.key ? { background: COLORS.primary } : {}}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[#EBEDF3] bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F7F8FB] text-xs text-[#8A8FA3]">
                    <th className="px-5 py-3 font-medium">អ្នកប្រើប្រាស់</th>
                    <th className="px-5 py-3 font-medium">តួនាទី</th>
                    <th className="px-5 py-3 font-medium">សាខា</th>
                    <th className="px-5 py-3 font-medium">លទ្ធផល Login</th>
                    <th className="px-5 py-3 font-medium">បញ្ហា</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map((user) => (
                    <tr key={user.uid || user.id || user.email} className="border-t border-[#EBEDF3] align-top">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF1FB] text-xs font-bold text-[#2A3F8F]">
                            {(user.name || user.email || "?").slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-[#1E2333]">{user.name || "—"}</div>
                            <div className="break-all text-xs text-[#B4B7C6]" dir="ltr">{user.email}</div>
                            {user.username && <div className="text-[11px] text-[#8A8FA3]" dir="ltr">@{user.username}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#5B5F73]">{ROLE_LABELS[user.role] || user.role || "—"}</td>
                      <td className="px-5 py-3.5 text-[#5B5F73]">{user.branch || "—"}</td>
                      <td className="px-5 py-3.5"><LoginStatus ready={user.ready} /></td>
                      <td className="max-w-[300px] px-5 py-3.5 text-xs text-[#8A8FA3]">{getIssueText(user)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {displayedUsers.map((user) => (
              <article key={user.uid || user.id || user.email} className="rounded-2xl border border-[#EBEDF3] bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF1FB] text-sm font-bold text-[#2A3F8F]">
                    {(user.name || user.email || "?").slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#1E2333]">{user.name || "—"}</div>
                    {user.username && <div className="mt-0.5 text-xs text-[#8A8FA3]" dir="ltr">@{user.username}</div>}
                  </div>
                  <LoginStatus ready={user.ready} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 text-xs min-[380px]:grid-cols-2">
                  <div className="flex min-w-0 items-start gap-2 rounded-xl bg-[#F7F8FB] px-3 py-2.5">
                    <Mail size={14} className="mt-0.5 shrink-0 text-[#8A8FA3]" />
                    <span className="min-w-0 break-all text-[#5B5F73]" dir="ltr">{user.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-[#F7F8FB] px-3 py-2.5">
                    <UserRound size={14} className="shrink-0 text-[#8A8FA3]" />
                    <span className="text-[#5B5F73]">{ROLE_LABELS[user.role] || user.role || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-[#F7F8FB] px-3 py-2.5 min-[380px]:col-span-2">
                    <Building2 size={14} className="shrink-0 text-[#8A8FA3]" />
                    <span className="text-[#5B5F73]">{user.branch || "មិនបានកំណត់សាខា"}</span>
                  </div>
                </div>

                <div className={`mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed ${getIssues(user).length ? "bg-[#FFF7E8] text-[#8A6212]" : "bg-[#E9F7EF] text-[#257C4B]"}`}>
                  <span className="font-semibold">បញ្ហា៖ </span>{getIssueText(user)}
                </div>
              </article>
            ))}
            {!displayedUsers.length && <div className="rounded-2xl border border-[#EBEDF3] bg-white py-10 text-center text-sm text-[#8A8FA3]">មិនមាន Login Account ទេ</div>}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {roles.map((role) => (
            <div key={role.id} className="flex flex-col gap-3 rounded-2xl border border-[#EBEDF3] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${role.color}1A` }}>
                  <Shield size={20} color={role.color} />
                </div>
                <div className="text-sm font-semibold text-[#1E2333]">{role.name}</div>
              </div>
              <p className="text-xs leading-relaxed text-[#5B5F73]">{role.description}</p>
              <div className="flex flex-wrap justify-between gap-2 border-t border-[#EBEDF3] pt-3 text-xs text-[#8A8FA3]">
                <span>{displayedUsers.filter((user) => user.role === role.name || user.role === role.id).length} អ្នកប្រើប្រាស់</span>
                <span className="font-medium text-[#2A3F8F]">សិទ្ធិកំណត់រួច</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
