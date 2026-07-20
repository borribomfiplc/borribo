import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Building2, Calendar,
  BarChart3, Settings, Search, Bell, ChevronDown, Sun, ChevronRight, ChevronLeft,
  UserPlus, FileText, ScanLine, Cake, Menu, LogOut
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

// Every other page is code-split with React.lazy so the initial bundle only
// pays for the dashboard home screen; each page's JS loads on first visit.
const EmployeeListPage = lazy(() => import("./pages/EmployeeListPage"));
const AddEmployeePage = lazy(() => import("./pages/AddEmployeePage"));
const DailyAttendancePage = lazy(() => import("./pages/DailyAttendancePage"));
const AttendanceHistoryPage = lazy(() => import("./pages/AttendanceHistoryPage"));
const AttendanceCorrectionPage = lazy(() => import("./pages/AttendanceCorrectionPage"));
const LeaveRequestPage = lazy(() => import("./pages/LeaveRequestPage"));
const LeaveApprovalPage = lazy(() => import("./pages/LeaveApprovalPage"));
const LeaveBalancePage = lazy(() => import("./pages/LeaveBalancePage"));
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

  const [openSection, setOpenSection] = useState("attendance");
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer state
  const [searchOpen, setSearchOpen] = useState(false); // mobile search toggle

  // Every collection below is a real-time Firestore listener with the same
  // [data, setData] shape as useState, so pages that call setX((list) => ...)
  // didn't need to change — see src/firebase/useFirestoreCollection.js.
  const [leaveRequests, setLeaveRequests] = useFirestoreCollection("leaveRequests", initialLeaveRequests); // shared across request + approval pages
  const [employees, setEmployees] = useFirestoreCollection("employees", initialEmployees); // shared across employee, attendance, leave, org pages
  const [todaysAttendance, setTodaysAttendance] = useFirestoreCollection("attendanceToday", attendanceToday); // live today's records, updated by kiosk check-in/out
  const [attendanceHistory, setAttendanceHistory] = useFirestoreCollection("attendanceHistory", historyData, "docId");
  const [corrections, setCorrections] = useFirestoreCollection("corrections", initialCorrections);
  const [branches, setBranches] = useFirestoreCollection("branches", initialBranches);
  const [departments, setDepartments] = useFirestoreCollection("departments", initialDepartments);
  const [jobRoles, setJobRoles] = useFirestoreCollection("jobRoles", initialJobRoles);
  const [holidays, setHolidays] = useFirestoreCollection("holidays", initialHolidays);
  const [users, setUsers] = useFirestoreCollection("users", initialUsers);
  const [roles, setRoles] = useFirestoreCollection("roles", initialRoles);

  const [employeeQuery, setEmployeeQuery] = useState(""); // controlled search text for EmployeeListPage
  const [editingEmployee, setEditingEmployee] = useState(null); // employee currently open in AddEmployeePage's edit mode
  const [kioskMode, setKioskMode] = useState(false); // true while the employee self check-in (PIN kiosk) screen is shown

  const deleteEmployee = (id) => setEmployees((list) => list.filter((e) => e.id !== id));
  const [headerQuery, setHeaderQuery] = useState(""); // topbar quick-search text

  const headerResults = headerQuery.trim()
    ? employees
        .filter(
          (e) =>
            e.name.includes(headerQuery.trim()) ||
            e.role.includes(headerQuery.trim()) ||
            e.branch.includes(headerQuery.trim()) ||
            e.id.toLowerCase().includes(headerQuery.trim().toLowerCase()) ||
            e.phone.includes(headerQuery.trim())
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

  if (kioskMode) {
    return (
      <KioskCheckInPage
        employees={employees}
        attendanceToday={todaysAttendance}
        setAttendanceToday={setTodaysAttendance}
        onExit={() => setKioskMode(false)}
      />
    );
  }

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
    return <LoginPage onKiosk={() => setKioskMode(true)} />;
  }

  return (
    <div
      className="min-h-screen bg-[#F5F6FA] flex"
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
          lg:static lg:translate-x-0 lg:z-auto`}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-[#EBEDF3] shrink-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: `linear-gradient(135deg, ${COLORS.primary}, #4A5FC1)` }}
          >
            ម
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-bold text-[15px] text-[#1E2333] truncate">ប្រព័ន្ធវត្តមាន MFI</div>
            <div className="text-[11px] text-[#8A8FA3] truncate">Attendance System</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {navSections.map((s) => (
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
          © 2026 MFI Attendance · v1.0.0
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-[#EBEDF3] flex items-center gap-2 sm:gap-4 px-3 sm:px-5 shrink-0 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "បិទម៉ឺនុយចំហៀង" : "បើកម៉ឺនុយចំហៀង"}
            aria-expanded={sidebarOpen}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] shrink-0"
          >
            <Menu size={19} />
          </button>

          {/* Desktop / tablet search */}
          <div className="hidden sm:block flex-1 max-w-md relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />
            <input
              aria-label="ស្វែងរកបុគ្គលិក"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              onKeyDown={handleHeaderSearchKeyDown}
              placeholder="ស្វែងរកបុគ្គលិក..."
              className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
            />
            {headerQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[#EBEDF3] shadow-lg overflow-hidden z-30">
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

          <div className="flex-1" />

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen((v) => { if (v) setHeaderQuery(""); return !v; })}
            aria-label={searchOpen ? "បិទប្រអប់ស្វែងរក" : "បើកប្រអប់ស្វែងរក"}
            aria-expanded={searchOpen}
            className="sm:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] shrink-0"
          >
            <Search size={18} />
          </button>

          <button
            aria-label="ជ្រើសរើសសាខា៖ ការិយាល័យកណ្តាល"
            className="hidden md:flex items-center gap-2 border border-[#EBEDF3] rounded-xl px-3.5 py-2 text-sm text-[#5B5F73] font-medium shrink-0"
          >
            <Building2 size={15} />
            ការិយាល័យកណ្តាល
            <ChevronDown size={14} />
          </button>

          <button
            aria-label="ការជូនដំណឹង (5 ថ្មី)"
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] shrink-0"
          >
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 bg-[#D9614F] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              5
            </span>
          </button>

          <button
            aria-label="ប្តូររចនាប័ទ្មពន្លឺ/ងងឹត"
            className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] shrink-0"
          >
            <Sun size={18} />
          </button>

          <div className="flex items-center gap-2.5 pl-2 sm:border-l border-[#EBEDF3] shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: COLORS.primary }}
            >
              ប
            </div>
            <div className="hidden md:block leading-tight">
              <div className="text-sm font-semibold text-[#1E2333]">ចាន់ បូរ៉ា</div>
              <div className="text-[11px] text-[#8A8FA3]">អ្នកគ្រប់គ្រង</div>
            </div>
            <ChevronDown size={14} className="hidden sm:block text-[#B4B7C6]" />
          </div>

          <button
            onClick={handleLogout}
            title="ចាកចេញ"
            aria-label="ចាកចេញពីប្រព័ន្ធ"
            className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center text-[#8A8FA3] hover:bg-[#FBEBE8] hover:text-[#D9614F] shrink-0"
          >
            <LogOut size={17} />
          </button>
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
        <Suspense fallback={<PageLoading />}>
        {active === "បញ្ជីបុគ្គលិក" ? (
          <EmployeeListPage
            onAddClick={() => { setEditingEmployee(null); setActive("បន្ថែមបុគ្គលិក"); }}
            onEditClick={(emp) => { setEditingEmployee(emp); setActive("បន្ថែមបុគ្គលិក"); }}
            onDeleteEmployee={deleteEmployee}
            employees={employees}
            query={employeeQuery}
            setQuery={setEmployeeQuery}
          />
        ) : active === "បន្ថែមបុគ្គលិក" ? (
          <AddEmployeePage
            onCancel={() => { setEditingEmployee(null); setActive("បញ្ជីបុគ្គលិក"); }}
            onSave={() => { setEditingEmployee(null); setActive("បញ្ជីបុគ្គលិក"); }}
            employees={employees}
            setEmployees={setEmployees}
            editingEmployee={editingEmployee}
          />
        ) : active === "វត្តមានប្រចាំថ្ងៃ" ? (
          <DailyAttendancePage attendanceToday={todaysAttendance} />
        ) : active === "ប្រវត្តិវត្តមាន" ? (
          <AttendanceHistoryPage historyData={attendanceHistory} />
        ) : active === "កែតម្រូវវត្តមាន" ? (
          <AttendanceCorrectionPage
            employees={employees}
            attendanceToday={todaysAttendance}
            corrections={corrections}
            setCorrections={setCorrections}
          />
        ) : active === "សំណើសុំច្បាប់" ? (
          <LeaveRequestPage requests={leaveRequests} setRequests={setLeaveRequests} employees={employees} />
        ) : active === "អនុម័តច្បាប់" ? (
          <LeaveApprovalPage requests={leaveRequests} setRequests={setLeaveRequests} employees={employees} />
        ) : active === "សមតុល្យច្បាប់" ? (
          <LeaveBalancePage requests={leaveRequests} employees={employees} />
        ) : active === "សាខា" ? (
          <BranchPage employees={employees} branches={branches} setBranches={setBranches} />
        ) : active === "នាយកដ្ឋាន" ? (
          <DepartmentPage employees={employees} departments={departments} setDepartments={setDepartments} />
        ) : active === "តួនាទីការងារ" ? (
          <JobRolePage
            employees={employees}
            jobRoles={jobRoles}
            setJobRoles={setJobRoles}
            departments={departments}
          />
        ) : active === "calendar" ? (
          <CalendarPage leaveRequests={leaveRequests} holidays={holidays} />
        ) : active === "របាយការណ៍វត្តមាន" ? (
          <AttendanceReportPage historyData={attendanceHistory} />
        ) : active === "របាយការណ៍ច្បាប់" ? (
          <LeaveReportPage leaveRequests={leaveRequests} />
        ) : active === "របាយការណ៍ប្រចាំខែ" ? (
          <MonthlyReportPage historyData={attendanceHistory} />
        ) : active === "ក្រុមហ៊ុន" ? (
          <CompanySettingsPage />
        ) : active === "អ្នកប្រើប្រាស់ និងតួនាទី" ? (
          <UserRolesPage
            users={users}
            setUsers={setUsers}
            roles={roles}
            branches={branches}
          />
        ) : active === "ម៉ោងធ្វើការ" ? (
          <WorkingHoursPage />
        ) : active === "ថ្ងៃឈប់សម្រាក" ? (
          <HolidaysSettingsPage holidays={holidays} setHolidays={setHolidays} />
        ) : active === "GPS និង QR" ? (
          <GpsQrPage branches={branches} />
        ) : active === "ប្រព័ន្ធ" ? (
          <SystemSettingsPage />
        ) : (
          <DashboardHomePage setActive={setActive} setOpenSection={setOpenSection} setEditingEmployee={setEditingEmployee} />
        )}
        </Suspense>
        </main>
      </div>
    </div>
  );
}


export default function MFIDashboard() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
