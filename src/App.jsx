import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Building2, Calendar,
  BarChart3, Settings, Search, Bell, ChevronDown, Sun, ChevronRight, ChevronLeft,
  UserPlus, FileText, ScanLine, Cake, Menu, LogOut, Moon, Check, Languages
} from "lucide-react";
import { COLORS } from "./data/theme";
import {
  initialLeaveRequests, initialEmployees, attendanceToday, historyData,
  initialCorrections, initialBranches, initialDepartments, initialJobRoles,
  initialHolidays, initialUsers, initialRoles,
} from "./data/mockData";
import { navSections } from "./config/navSections";
import NavGroup from "./components/shared/NavGroup";
import ErrorBoundary from "./components/ErrorBoundary";
import LoginPage from "./pages/LoginPage";
import KioskCheckInPage from "./pages/KioskCheckInPage";
import DashboardHomePage from "./pages/DashboardHomePage";
import { useFirestoreCollection } from "./firebase/useFirestoreCollection";
import { watchAuthState, logout as firebaseLogout } from "./firebase/auth";
import { useUserProfile } from "./firebase/useUserProfile";
import { filterNavigation, isManager, ROLE_LABELS, ROLES } from "./auth/permissions";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import { useEnglishUi } from "./i18n/useEnglishUi";
import { reactivateEmployee, removeEmployee } from "./services/employees";
import { useAutoSignOut } from "./hooks/useAutoSignOut";

// Every other page is code-split with React.lazy so the initial bundle only
// pays for the dashboard home screen; each page's JS loads on first visit.
const EmployeeListPage = lazy(() => import("./pages/EmployeeListPage"));
const AddEmployeePage = lazy(() => import("./pages/AddEmployeePage"));
const EmployeeDetailsPage = lazy(() => import("./pages/EmployeeDetailsPage"));
const DailyAttendancePage = lazy(() => import("./pages/DailyAttendancePage"));
const AttendanceHistoryPage = lazy(() => import("./pages/AttendanceHistoryPage"));
const AttendanceCorrectionPage = lazy(() => import("./pages/AttendanceCorrectionPage"));
const LeaveRequestPage = lazy(() => import("./pages/LeaveRequestPage"));
const LeaveApprovalPage = lazy(() => import("./pages/LeaveApprovalPage"));
const LeaveBalancePage = lazy(() => import("./pages/LeaveBalancePage"));
const OrganizationStructurePage = lazy(() => import("./pages/OrganizationStructurePage"));
const BranchPage = lazy(() => import("./pages/BranchPage"));
const DepartmentPage = lazy(() => import("./pages/DepartmentPage"));
const JobRolePage = lazy(() => import("./pages/JobRolePage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const AttendanceReportPage = lazy(() => import("./pages/AttendanceReportPage"));
const LeaveReportPage = lazy(() => import("./pages/LeaveReportPage"));
const MonthlyReportPage = lazy(() => import("./pages/MonthlyReportPage"));
const CompanySettingsPage = lazy(() => import("./pages/CompanySettingsPage"));
const UserRolesPage = lazy(() => import("./pages/UserRolesPage"));
const WorkingHoursPage = lazy(() => import("./pages/WorkingHoursPage"));
const HolidaysSettingsPage = lazy(() => import("./pages/HolidaysSettingsPage"));
const GpsQrPage = lazy(() => import("./pages/GpsQrPage"));
const SystemSettingsPage = lazy(() => import("./pages/SystemSettingsPage"));
const KpiDashboardPage = lazy(() => import("./pages/KpiDashboardPage"));
const AssetManagementPage = lazy(() => import("./pages/AssetManagementPage"));
const StaffLoanPage = lazy(() => import("./pages/StaffLoanPage"));
const FingerprintPage = lazy(() => import("./pages/FingerprintPage"));
const TelegramBotPage = lazy(() => import("./pages/TelegramBotPage"));
const EmployeePortalPage = lazy(() => import("./pages/EmployeePortalPage"));

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-[#8A8FA3]">
      កំពុងផ្ទុក...
    </div>
  );
}

function App() {
  // undefined = still checking Firebase Auth session; null = logged out.
  const [authUser, setAuthUser] = useState(undefined);
  useEffect(() => watchAuthState(setAuthUser), []);
  const loggedIn = !!authUser;
  const { profile, loading: profileLoading } = useUserProfile(authUser);
  const managerAccess = Boolean(profile && isManager(profile.role));
  const adminAccess = profile?.role === ROLES.ADMIN;
  const kioskAccess = profile?.role === ROLES.KIOSK;

  const [openSection, setOpenSection] = useState("attendance");
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer state
  const [searchOpen, setSearchOpen] = useState(false); // mobile search toggle
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("borribo-theme") === "dark");
  const [language, setLanguage] = useState(() => localStorage.getItem("borribo-language") || "ខ្មែរ");
  const [selectedBranch, setSelectedBranch] = useState(() => localStorage.getItem("borribo-selected-branch") || "");
  const topbarRef = useRef(null);
  useEnglishUi(language);

  // A user can log out from any screen then sign in again without a full page
  // reload. Reset the workspace for each new signed-in account so the first
  // page is always the dashboard, rather than the last page used before logout.
  useEffect(() => {
    if (!authUser) return;
    setActive("dashboard");
    setOpenSection(null);
    setEmployeeQuery("");
    setHeaderQuery("");
    setSearchOpen(false);
    setSidebarOpen(false);
    setBranchMenuOpen(false);
    setNotificationOpen(false);
    setProfileMenuOpen(false);
    setLanguageMenuOpen(false);
  }, [authUser?.uid]);

  // Every collection below is a real-time Firestore listener with the same
  // [data, setData] shape as useState, so pages that call setX((list) => ...)
  // didn't need to change — see src/firebase/useFirestoreCollection.js.
  const [leaveRequests, setLeaveRequests] = useFirestoreCollection("leaveRequests", initialLeaveRequests, "id", managerAccess);
  const [employees, setEmployees] = useFirestoreCollection("employees", initialEmployees, "id", managerAccess || kioskAccess);
  const [todaysAttendance, setTodaysAttendance] = useFirestoreCollection("attendanceToday", attendanceToday, "recordId", managerAccess || kioskAccess);
  const [attendanceHistory, setAttendanceHistory] = useFirestoreCollection("attendanceHistory", historyData, "docId", managerAccess || kioskAccess);
  const [corrections, setCorrections] = useFirestoreCollection("corrections", initialCorrections, "id", managerAccess);
  const [branches, setBranches] = useFirestoreCollection("branches", initialBranches, "id", loggedIn);
  const [departments, setDepartments] = useFirestoreCollection("departments", initialDepartments, "id", managerAccess);
  const [jobRoles, setJobRoles] = useFirestoreCollection("jobRoles", initialJobRoles, "id", managerAccess);
  const [holidays, setHolidays] = useFirestoreCollection("holidays", initialHolidays, "id", loggedIn);
  const [calendarEvents, setCalendarEvents] = useFirestoreCollection("calendarEvents", [], "id", managerAccess);
  const [users, setUsers] = useFirestoreCollection("users", initialUsers, "id", adminAccess);
  const [roles, setRoles] = useFirestoreCollection("roles", initialRoles, "id", adminAccess);
  const [kpis, setKpis] = useFirestoreCollection("kpis", [], "kpiId", managerAccess);
  const [assets, setAssets] = useFirestoreCollection("assets", [], "assetId", managerAccess);
  const [staffLoans, setStaffLoans] = useFirestoreCollection("staffLoans", [], "loanId", managerAccess);
  const [telegramOutbox, setTelegramOutbox] = useFirestoreCollection("telegramOutbox", [], "id", managerAccess);
  const [employmentActions] = useFirestoreCollection("employmentActions", [], "id", managerAccess);

  // Branch is a reporting dimension. The Topbar selection deliberately scopes
  // dashboard and report inputs without mutating records from other branches.
  const filterByBranch = (rows = []) => selectedBranch ? rows.filter((row) => row.branch === selectedBranch) : rows;
  const scopedEmployees = useMemo(() => filterByBranch(employees), [employees, selectedBranch]);
  const scopedAttendanceToday = useMemo(() => filterByBranch(todaysAttendance), [todaysAttendance, selectedBranch]);
  const scopedAttendanceHistory = useMemo(() => filterByBranch(attendanceHistory), [attendanceHistory, selectedBranch]);
  const scopedLeaveRequests = useMemo(() => filterByBranch(leaveRequests), [leaveRequests, selectedBranch]);

  const [employeeQuery, setEmployeeQuery] = useState(""); // controlled search text for EmployeeListPage
  const [editingEmployee, setEditingEmployee] = useState(null); // employee currently open in AddEmployeePage's edit mode
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const deleteEmployee = (employee) => removeEmployee(employee);
  const restoreEmployee = (employee) => reactivateEmployee(employee);
  const [headerQuery, setHeaderQuery] = useState(""); // topbar quick-search text

  useEffect(() => {
    localStorage.setItem("borribo-selected-branch", selectedBranch);
  }, [selectedBranch]);

  // Keep a stored selection valid after an administrator renames/deletes a branch.
  useEffect(() => {
    if (selectedBranch && branches.length && !branches.some((branch) => branch.name === selectedBranch)) setSelectedBranch("");
  }, [branches, selectedBranch]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (topbarRef.current && !topbarRef.current.contains(event.target)) {
        setBranchMenuOpen(false); setNotificationOpen(false); setProfileMenuOpen(false); setLanguageMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const headerResults = headerQuery.trim()
    ? employees
        .filter(
          (e) =>
            String(e.name || "").includes(headerQuery.trim()) ||
            String(e.role || "").includes(headerQuery.trim()) ||
            String(e.branch || "").includes(headerQuery.trim()) ||
            String(e.id || "").toLowerCase().includes(headerQuery.trim().toLowerCase()) ||
            String(e.phone || "").includes(headerQuery.trim())
        )
        .slice(0, 6)
    : [];

  const goToEmployeeSearch = (q) => {
    setEmployeeQuery(q);
    setOpenSection("employees");
    setActive("បញ្ជីបុគ្គលិក");
    setHeaderQuery("");
    setSearchOpen(false);
    setSidebarOpen(false);
  };

  const handleHeaderSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (headerQuery.trim()) goToEmployeeSearch(headerQuery.trim());
    } else if (e.key === "Escape") {
      setHeaderQuery("");
    }
  };

  const toggleSection = (key) =>
    setOpenSection((prev) => (prev === key ? null : key));

  const handleLogout = () => firebaseLogout();
  useAutoSignOut(authUser, firebaseLogout);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("borribo-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const chooseLanguage = (value) => {
    setLanguage(value);
    localStorage.setItem("borribo-language", value);
    setLanguageMenuOpen(false);
  };

  const notificationStorageKey = `borribo-read-notifications-${authUser?.uid || "guest"}`;
  const [readNotificationIds, setReadNotificationIds] = useState(() => new Set());
  useEffect(() => {
    try { setReadNotificationIds(new Set(JSON.parse(localStorage.getItem(notificationStorageKey) || "[]"))); }
    catch { setReadNotificationIds(new Set()); }
  }, [notificationStorageKey]);
  const saveReadNotifications = (next) => {
    setReadNotificationIds(next);
    localStorage.setItem(notificationStorageKey, JSON.stringify([...next]));
  };
  const topbarNotifications = useMemo(() => {
    const pendingLeaves = leaveRequests.filter((row) => row.status === "រង់ចាំពិនិត្យ");
    const pendingCorrections = corrections.filter((row) => row.status === "រង់ចាំពិនិត្យ");
    const lateToday = todaysAttendance.filter((row) => row.status === "យឺត");
    return [
      ...(managerAccess && pendingLeaves.length ? [{ id: `leave-${pendingLeaves.map((row) => row.id).join("-")}`, text: `មានសំណើច្បាប់ ${pendingLeaves.length} កំពុងរង់ចាំអនុម័ត`, detail: "ទៅកាន់ Leave Approval", page: "អនុម័តច្បាប់", section: "leave" }] : []),
      ...(managerAccess && pendingCorrections.length ? [{ id: `correction-${pendingCorrections.map((row) => row.id).join("-")}`, text: `មានសំណើកែវត្តមាន ${pendingCorrections.length} កំពុងរង់ចាំពិនិត្យ`, detail: "ទៅកាន់ Attendance Correction", page: "កែតម្រូវវត្តមាន", section: "attendance" }] : []),
      ...(lateToday.length ? [{ id: `late-${lateToday.map((row) => row.recordId || row.id).join("-")}`, text: `បុគ្គលិក ${lateToday.length} នាក់មកយឺតថ្ងៃនេះ`, detail: "ទៅកាន់ Daily Attendance", page: "វត្តមានប្រចាំថ្ងៃ", section: "attendance" }] : []),
    ];
  }, [leaveRequests, corrections, todaysAttendance, managerAccess]);
  const unreadNotifications = topbarNotifications.filter((note) => !readNotificationIds.has(note.id));
  const openNotification = (notification) => {
    const next = new Set(readNotificationIds); next.add(notification.id); saveReadNotifications(next);
    setActive(notification.page); setOpenSection(notification.section); setNotificationOpen(false);
  };

  if (authUser === undefined) {
    // Brief flash while Firebase checks for a persisted session — avoids a
    // flicker to the login screen for users who are already signed in.
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA] text-sm text-[#8A8FA3]">
        កំពុងផ្ទុក...
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginPage />;
  }

  if (profileLoading) {
    return <PageLoading />;
  }

  if (!profile) {
    return <AccessDeniedPage onLogout={handleLogout} />;
  }

  if (profile.role === ROLES.KIOSK) {
    return <KioskCheckInPage employees={employees} attendanceToday={todaysAttendance} setAttendanceToday={setTodaysAttendance} attendanceHistory={attendanceHistory} setAttendanceHistory={setAttendanceHistory} onExit={handleLogout} />;
  }

  if (profile.role === ROLES.EMPLOYEE) {
    return <Suspense fallback={<PageLoading />}><EmployeePortalPage authUser={authUser} profile={profile} branches={branches} holidays={holidays} onLogout={handleLogout} /></Suspense>;
  }

  const visibleNavSections = filterNavigation(navSections, profile.role);

  return (
    <div
      className={`h-screen h-dvh overflow-hidden flex ${darkMode ? "bg-[#151827] text-white" : "bg-[#F5F6FA]"}`}
      style={{ fontFamily: "'Noto Sans Khmer','Inter',sans-serif" }}
    >
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-[#EBEDF3] flex flex-col shrink-0 w-[264px]
          fixed inset-y-0 left-0 z-40 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:inset-auto lg:translate-x-0 lg:z-auto`}
      >
        <div className="h-16 flex items-center px-5 border-b border-[#EBEDF3] shrink-0">
          <img src="/assets/borribo-logo.png" alt="BORRIBO MFI" className="w-[185px] h-auto object-contain object-left" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {visibleNavSections.map((s) => (
            <NavGroup
              key={s.key}
              section={s}
              open={openSection === s.key}
              onToggle={toggleSection}
              active={active}
              onSelect={(v) => {
                setActive(v);
                setSidebarOpen(false);
              }}
            />
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-[#EBEDF3] text-[11px] text-[#B4B7C6] shrink-0">
          © 2026 BORRIBO MFI · v34
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Topbar */}
        <header ref={topbarRef} className="h-14 sm:h-16 bg-white border-b border-[#EBEDF3] flex items-center gap-1.5 sm:gap-4 px-2.5 sm:px-5 shrink-0 z-20">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "បិទម៉ឺនុយចំហៀង" : "បើកម៉ឺនុយចំហៀង"}
            aria-expanded={sidebarOpen}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] shrink-0"
          >
            <Menu size={19} />
          </button>

          <div className="hidden sm:block flex-1 max-w-md relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />
            <input aria-label="ស្វែងរកបុគ្គលិក" value={headerQuery} onChange={(e) => setHeaderQuery(e.target.value)} onKeyDown={handleHeaderSearchKeyDown} placeholder="ស្វែងរកបុគ្គលិក..." className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20" />
            {headerQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[#EBEDF3] shadow-lg overflow-hidden z-30">
                {headerResults.length ? headerResults.map((e) => (
                  <button key={e.id} onClick={() => goToEmployeeSearch(e.name)} className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-[#F7F8FB] border-b border-[#EBEDF3] last:border-0">
                    <div className="w-8 h-8 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">{e.name.slice(0, 1)}</div>
                    <div className="flex-1 min-w-0 text-right"><div className="text-sm font-medium text-[#1E2333] truncate">{e.name}</div><div className="text-xs text-[#8A8FA3] truncate">{e.role} · {e.branch}</div></div>
                  </button>
                )) : <div className="px-4 py-3 text-sm text-[#8A8FA3] text-center">រកមិនឃើញបុគ្គលិកទេ</div>}
              </div>
            )}
          </div>
          <div className="flex-1" />

          <button onClick={() => setSearchOpen((v) => !v)} aria-label="បើកប្រអប់ស្វែងរក" className="sm:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] shrink-0"><Search size={18} /></button>

          <div className="relative">
            <button onClick={() => { setBranchMenuOpen((v) => !v); setNotificationOpen(false); setProfileMenuOpen(false); setLanguageMenuOpen(false); }} aria-expanded={branchMenuOpen} aria-label={`ជ្រើសរើសសាខា៖ ${selectedBranch || "គ្រប់សាខា"}`} className="flex items-center gap-2 border border-[#EBEDF3] rounded-xl px-2.5 xl:px-3.5 py-2 text-sm text-[#5B5F73] font-medium shrink-0"><Building2 size={15} /><span className="hidden xl:inline max-w-40 truncate">{selectedBranch || "គ្រប់សាខា"}</span><ChevronDown size={14} className="hidden xl:block" /></button>
            {branchMenuOpen && <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-[#EBEDF3] bg-white shadow-lg z-50 overflow-hidden"><button onClick={() => { setSelectedBranch(""); setBranchMenuOpen(false); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right text-sm text-[#1E2333] hover:bg-[#F7F8FB]"><span>គ្រប់សាខា</span>{!selectedBranch && <Check size={16} className="text-[#2A3F8F]" />}</button>{branches.map((branch) => <button key={branch.id} onClick={() => { setSelectedBranch(branch.name); setBranchMenuOpen(false); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right text-sm text-[#1E2333] hover:bg-[#F7F8FB]"><span className="truncate">{branch.name}</span>{selectedBranch === branch.name && <Check size={16} className="text-[#2A3F8F] shrink-0" />}</button>)}</div>}
          </div>

          <div className="relative">
            <button
              onClick={() => { setLanguageMenuOpen((v) => !v); setBranchMenuOpen(false); setNotificationOpen(false); setProfileMenuOpen(false); }}
              aria-expanded={languageMenuOpen}
              aria-label={`ជ្រើសរើសភាសា៖ ${language}`}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[#5B5F73] hover:bg-[#F5F6FA] shrink-0"
            >
              <Languages size={18} />
              <span className="hidden lg:inline">{language === "ខ្មែរ" ? "ខ្មែរ" : "EN"}</span>
              <ChevronDown size={14} className="hidden lg:block" />
            </button>
            {languageMenuOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-36 rounded-xl border border-[#EBEDF3] bg-white shadow-lg z-50 overflow-hidden">
                {["ខ្មែរ", "English"].map((option) => (
                  <button key={option} onClick={() => chooseLanguage(option)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right text-sm text-[#1E2333] hover:bg-[#F7F8FB]">
                    <span>{option}</span>{language === option && <Check size={16} className="text-[#2A3F8F]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setNotificationOpen((v) => !v); setBranchMenuOpen(false); setProfileMenuOpen(false); setLanguageMenuOpen(false); }} aria-expanded={notificationOpen} aria-label={`ការជូនដំណឹង (${unreadNotifications.length} ថ្មី)`} className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] shrink-0"><Bell size={18} />{unreadNotifications.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#D9614F] text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">{unreadNotifications.length}</span>}</button>
            {notificationOpen && <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-xl border border-[#EBEDF3] bg-white shadow-lg z-50 overflow-hidden"><div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#EBEDF3]"><div className="text-sm font-semibold text-[#1E2333]">ការជូនដំណឹងថ្មី</div>{unreadNotifications.length > 0 && <button onClick={() => saveReadNotifications(new Set(topbarNotifications.map((note) => note.id)))} className="text-xs font-medium text-[#2A3F8F] whitespace-nowrap">សម្គាល់ថាបានអានទាំងអស់</button>}</div>{topbarNotifications.length ? topbarNotifications.map((note) => <button key={note.id} onClick={() => openNotification(note)} className={`w-full px-4 py-3 text-right border-b border-[#EBEDF3] last:border-0 hover:bg-[#F7F8FB] ${readNotificationIds.has(note.id) ? "" : "bg-[#F7F8FB]"}`}><div className="text-sm text-[#1E2333]">{note.text}</div><div className="text-xs text-[#2A3F8F] mt-1">{note.detail}</div></button>) : <div className="px-4 py-5 text-sm text-[#8A8FA3] text-center">មិនមានការជូនដំណឹងថ្មីទេ</div>}</div>}
          </div>

          <button onClick={() => setDarkMode((v) => !v)} aria-label="ប្តូររចនាប័ទ្មពន្លឺ/ងងឹត" className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] shrink-0">{darkMode ? <Moon size={18} /> : <Sun size={18} />}</button>

          <div className="relative flex items-center gap-2 sm:gap-2.5 pl-1.5 sm:pl-2 sm:border-l border-[#EBEDF3] shrink-0">
          <button onClick={() => { setProfileMenuOpen((v) => !v); setBranchMenuOpen(false); setNotificationOpen(false); setLanguageMenuOpen(false); }} aria-expanded={profileMenuOpen} className="flex items-center gap-2.5 text-right">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: COLORS.primary }}
            >
              ប
            </div>
            <div className="hidden md:block leading-tight">
              <div className="text-sm font-semibold text-[#1E2333]">{profile.name || authUser.email}</div>
              <div className="text-[11px] text-[#8A8FA3]">{ROLE_LABELS[profile.role] || profile.role}</div>
            </div>
            <ChevronDown size={14} className="hidden sm:block text-[#B4B7C6]" />
          </button>
          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-1rem)] rounded-xl border border-[#EBEDF3] bg-white shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#EBEDF3]"><div className="text-sm font-semibold text-[#1E2333] truncate">{profile.name || authUser.email}</div><div className="text-xs text-[#8A8FA3]">{ROLE_LABELS[profile.role] || profile.role}</div></div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#D9614F] hover:bg-[#FBEBE8]"><LogOut size={16} /> ចាកចេញ</button>
            </div>
          )}
          </div>

        </header>

        {/* Mobile search bar (expands under header) */}
        {searchOpen && (
          <div className="sm:hidden px-3 py-3 bg-white border-b border-[#EBEDF3] relative">
            <Search size={16} className="absolute right-7 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />
            <input
              autoFocus
              aria-label="ស្វែងរកបុគ្គលិក"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              onKeyDown={handleHeaderSearchKeyDown}
              placeholder="ស្វែងរកបុគ្គលិក..."
              className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
            />
            {headerQuery.trim() && (
              <div className="absolute top-full left-3 right-3 mt-1.5 bg-white rounded-xl border border-[#EBEDF3] shadow-lg overflow-hidden z-30">
                {headerResults.length > 0 ? (
                  <>
                    {headerResults.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => goToEmployeeSearch(e.name)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-[#F7F8FB] border-b border-[#EBEDF3] last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                          {e.name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <div className="text-sm font-medium text-[#1E2333] truncate">{e.name}</div>
                          <div className="text-xs text-[#8A8FA3] truncate">{e.role} · {e.branch}</div>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => goToEmployeeSearch(headerQuery.trim())}
                      className="w-full text-center text-xs font-medium text-[#2A3F8F] px-4 py-2.5 hover:bg-[#F7F8FB]"
                    >
                      មើលលទ្ធផលទាំងអស់សម្រាប់ "{headerQuery.trim()}"
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-3 text-sm text-[#8A8FA3] text-center">រកមិនឃើញបុគ្គលិកទេ</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-3 sm:p-5 lg:p-6 pb-24 sm:pb-5 lg:pb-6">
        <Suspense fallback={<PageLoading />}>
        {active === "បញ្ជីបុគ្គលិក" ? (
          <EmployeeListPage
            onAddClick={() => { setEditingEmployee(null); setActive("បន្ថែមបុគ្គលិក"); }}
            onEditClick={(emp) => { setEditingEmployee(emp); setActive("បន្ថែមបុគ្គលិក"); }}
            onViewClick={(emp) => { setSelectedEmployee(emp); setActive("ព័ត៌មានបុគ្គលិក"); }}
            onDeleteEmployee={deleteEmployee}
            onReactivateEmployee={restoreEmployee}
            employees={employees}
            query={employeeQuery}
            setQuery={setEmployeeQuery}
          />
        ) : active === "បន្ថែមបុគ្គលិក" ? (
          <AddEmployeePage
            onCancel={() => { setEditingEmployee(null); setActive("បញ្ជីបុគ្គលិក"); }}
            onSave={() => { setEditingEmployee(null); setEmployeeQuery(""); setActive("បញ្ជីបុគ្គលិក"); }}
            employees={employees}
            editingEmployee={editingEmployee}
            branches={branches}
            departments={departments}
            jobRoles={jobRoles}
            actorRole={profile.role}
          />
        ) : active === "ព័ត៌មានបុគ្គលិក" ? (
          <EmployeeDetailsPage
            employee={employees.find((item) => item.id === selectedEmployee?.id) || selectedEmployee}
            employees={employees}
            onBack={() => { setSelectedEmployee(null); setActive("បញ្ជីបុគ្គលិក"); }}
            onEdit={(employee) => { setEditingEmployee(employee); setActive("បន្ថែមបុគ្គលិក"); }}
            employmentActions={employmentActions}
            branches={branches}
            departments={departments}
            jobRoles={jobRoles}
            actorRole={profile.role}
          />
        ) : active === "វត្តមានប្រចាំថ្ងៃ" ? (
          <DailyAttendancePage
            employees={employees}
            attendanceToday={todaysAttendance}
            setAttendanceToday={setTodaysAttendance}
            attendanceHistory={attendanceHistory}
            setAttendanceHistory={setAttendanceHistory}
            leaveRequests={leaveRequests}
            holidays={holidays}
          />
        ) : active === "ប្រវត្តិវត្តមាន" ? (
          <AttendanceHistoryPage historyData={attendanceHistory} />
        ) : active === "កែតម្រូវវត្តមាន" ? (
          <AttendanceCorrectionPage
            employees={employees}
            attendanceToday={todaysAttendance}
            setAttendanceToday={setTodaysAttendance}
            attendanceHistory={attendanceHistory}
            setAttendanceHistory={setAttendanceHistory}
            corrections={corrections}
            setCorrections={setCorrections}
            profile={profile}
          />
        ) : active === "សំណើសុំច្បាប់" ? (
          <LeaveRequestPage requests={leaveRequests} />
        ) : active === "អនុម័តច្បាប់" ? (
          <LeaveApprovalPage requests={leaveRequests} employees={employees} profile={profile} holidays={holidays} />
        ) : active === "សមតុល្យច្បាប់" ? (
          <LeaveBalancePage requests={leaveRequests} employees={employees} holidays={holidays} />
        ) : active === "រចនាសម្ព័ន្ធអង្គភាព" ? (
          <OrganizationStructurePage
            employees={employees}
            branches={branches}
            departments={departments}
            jobRoles={jobRoles}
            changes={employmentActions}
            profile={profile}
          />
        ) : active === "សាខា" ? (
          <BranchPage
            employees={employees}
            setEmployees={setEmployees}
            branches={branches}
            setBranches={setBranches}
            attendanceHistory={attendanceHistory}
          />
        ) : active === "នាយកដ្ឋាន" ? (
          <DepartmentPage employees={employees} setEmployees={setEmployees} departments={departments} setDepartments={setDepartments} jobRoles={jobRoles} setJobRoles={setJobRoles} />
        ) : active === "តួនាទីការងារ" ? (
          <JobRolePage
            employees={employees}
            setEmployees={setEmployees}
            jobRoles={jobRoles}
            setJobRoles={setJobRoles}
            departments={departments}
          />
        ) : active === "calendar" ? (
          <CalendarPage
            leaveRequests={leaveRequests}
            holidays={holidays}
            calendarEvents={calendarEvents}
            setCalendarEvents={setCalendarEvents}
            attendanceToday={todaysAttendance}
            attendanceHistory={attendanceHistory}
            employees={employees}
            branches={branches}
            departments={departments}
            profile={profile}
          />
        ) : active === "KPI Dashboard" ? (
          <KpiDashboardPage employees={employees} kpis={kpis} setKpis={setKpis} />
        ) : active === "គ្រប់គ្រងទ្រព្យសម្បត្តិ" ? (
          <AssetManagementPage employees={employees} assets={assets} setAssets={setAssets} />
        ) : active === "កម្ចីបុគ្គលិក" ? (
          <StaffLoanPage employees={employees} loans={staffLoans} setLoans={setStaffLoans} />
        ) : active === "របាយការណ៍វត្តមាន" ? (
          <AttendanceReportPage historyData={scopedAttendanceHistory} />
        ) : active === "របាយការណ៍ច្បាប់" ? (
          <LeaveReportPage leaveRequests={scopedLeaveRequests} />
        ) : active === "របាយការណ៍ប្រចាំខែ" ? (
          <MonthlyReportPage historyData={scopedAttendanceHistory} />
        ) : active === "ក្រុមហ៊ុន" ? (
          <CompanySettingsPage />
        ) : active === "អ្នកប្រើប្រាស់ និងតួនាទី" ? (
          <UserRolesPage
            users={users}
            roles={roles}
          />
        ) : active === "ម៉ោងធ្វើការ" ? (
          <WorkingHoursPage />
        ) : active === "ថ្ងៃឈប់សម្រាក" ? (
          <HolidaysSettingsPage holidays={holidays} setHolidays={setHolidays} />
        ) : active === "GPS និង QR" ? (
          <GpsQrPage branches={branches} />
        ) : active === "ប្រព័ន្ធ" ? (
          <SystemSettingsPage />
        ) : active === "Fingerprint ម៉ាស៊ីន" ? (
          <FingerprintPage employees={employees} attendanceToday={todaysAttendance} setAttendanceToday={setTodaysAttendance} attendanceHistory={attendanceHistory} setAttendanceHistory={setAttendanceHistory} />
        ) : active === "Telegram Bot" ? (
          <TelegramBotPage outbox={telegramOutbox} />
        ) : (
          <DashboardHomePage employees={scopedEmployees} attendanceToday={scopedAttendanceToday} attendanceHistory={scopedAttendanceHistory} leaveRequests={scopedLeaveRequests} profile={profile} setActive={setActive} setOpenSection={setOpenSection} setEditingEmployee={setEditingEmployee} />
        )}
        </Suspense>
        </main>
      </div>

      {/* On phones, the important areas are one tap away.  The full sidebar
          remains available from "More" for settings and reporting pages. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[68px] items-stretch border-t border-[#EBEDF3] bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_rgba(30,35,51,0.06)] lg:hidden">
        {[
          { label: "ទំព័រដើម", icon: LayoutDashboard, page: "dashboard", section: null },
          { label: "វត្តមាន", icon: Clock, page: "វត្តមានប្រចាំថ្ងៃ", section: "attendance" },
          { label: "ច្បាប់ឈប់", icon: CalendarDays, page: "អនុម័តច្បាប់", section: "leave" },
          { label: "បុគ្គលិក", icon: Users, page: "បញ្ជីបុគ្គលិក", section: "employees" },
        ].map((item) => {
          const Icon = item.icon;
          const selected = active === item.page || (item.page === "dashboard" && active === "dashboard");
          return (
            <button
              key={item.label}
              onClick={() => { setActive(item.page); setOpenSection(item.section); setSidebarOpen(false); }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors ${selected ? "text-[#2A3F8F]" : "text-[#8A8FA3]"}`}
              aria-current={selected ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={selected ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => setSidebarOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-[#8A8FA3]" aria-label="បើកមុខងារផ្សេងទៀត">
          <Menu size={20} />
          <span>ផ្សេងទៀត</span>
        </button>
      </nav>
    </div>
  );
}


export default function MFIDashboard() {
  return (
    <ErrorBoundary>
      <App />
      <PwaInstallPrompt />
    </ErrorBoundary>
  );
}
