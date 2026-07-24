import React, { useEffect, useState } from "react";
import { Bell, Sun, Wrench, Lock } from "lucide-react";
import { FieldLabel, SelectField } from "../components/shared/FormFields";
import { ToggleRow, SettingsSaveBar } from "../components/shared/SettingsWidgets";
import { loadSettingsDoc, saveSystemSettings } from "../firebase/settingsDoc";
import {
  BACKUP_FREQUENCY_OPTIONS,
  DEFAULT_SYSTEM_SETTINGS,
  normalizeSystemSettings,
  SESSION_TIMEOUT_OPTIONS,
  backupFrequencyLabel,
  timeoutLabel,
} from "../config/systemSettings";
import {
  getSystemRuntimeStatus,
  isSystemWorkerConfigured,
  runSystemBackup,
  testSystemEmail,
} from "../services/system";


function backupStatusLabel(value) {
  return {
    never: "មិនទាន់បាន Backup",
    started: "កំពុងដំណើរការ",
    completed: "បានបញ្ចប់",
    failed: "បរាជ័យ",
  }[value] || String(value || "មិនទាន់បាន Backup");
}

function formatDateTime(value) {
  if (!value) return "មិនទាន់មាន";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("km-KH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Phnom_Penh",
  }).format(date);
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [runtime, setRuntime] = useState(null);

  const refreshRuntime = async () => {
    if (!isSystemWorkerConfigured()) return;
    try {
      const result = await getSystemRuntimeStatus();
      setRuntime(result);
      if (result.settings) setSettings((current) => normalizeSystemSettings({ ...current, ...result.settings }));
    } catch (runtimeError) {
      console.error("Failed to load system runtime status", runtimeError);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await loadSettingsDoc("system", DEFAULT_SYSTEM_SETTINGS);
        if (cancelled) return;
        setSettings(normalizeSystemSettings(data));
        setSettingsLoaded(true);
        await refreshRuntime();
      } catch (loadError) {
        if (!cancelled) { setSettingsLoaded(false); setError(loadError?.message || "មិនអាចទាញយកការកំណត់ប្រព័ន្ធបានទេ"); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const {
    emailNotif, pushNotif, autoLock, autoBackup, darkMode,
    sessionTimeoutMinutes, backupFreq,
  } = settings;
  const set = (key) => (value) => setSettings((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    if (saving || !settingsLoaded) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const normalized = await saveSystemSettings(settings);
      setSettings(normalized);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await refreshRuntime();
    } catch (saveError) {
      setError(saveError.message || "មិនអាចរក្សាទុកការកំណត់បានទេ");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (kind, callback, successMessage) => {
    if (!settingsLoaded || action) return;
    setAction(kind);
    setError("");
    setMessage("");
    try {
      const result = await callback();
      if (result?.skipped) {
        const skippedMessage = {
          "backup-in-progress": "Backup មួយកំពុងដំណើរការរួចហើយ",
          "bucket-not-configured": "Backup bucket មិនទាន់បានកំណត់",
          "not-due": "មិនទាន់ដល់ពេល Backup បន្ទាប់",
        }[result.reason] || "សកម្មភាពនេះត្រូវបានរំលង";
        setMessage(skippedMessage);
      } else {
        setMessage(successMessage);
      }
      await refreshRuntime();
    } catch (actionError) {
      setError(actionError.message || "សកម្មភាពមិនបានជោគជ័យ");
    } finally {
      setAction("");
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-sm text-[#8A8FA3]">កំពុងផ្ទុក...</div>;
  }

  const workerConfigured = isSystemWorkerConfigured();
  const emailConfigured = runtime?.emailConfigured === true;
  const backupConfigured = runtime?.backupConfigured === true;
  const lastBackupAt = runtime?.settings?.lastBackupCompletedAt
    || runtime?.settings?.lastBackupAt
    || settings.lastBackupCompletedAt
    || settings.lastBackupAt;
  const lastBackupStatus = runtime?.settings?.lastBackupStatus || settings.lastBackupStatus;
  const lastBackupError = runtime?.settings?.lastBackupError || settings.lastBackupError;

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ប្រព័ន្ធ</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">ការជូនដំណឹង សុវត្ថិភាព ការបង្ហាញ និងការបម្រុងទុកទិន្នន័យ</p>
      </div>
      <SettingsSaveBar onSave={handleSave} saved={saved} saving={saving} disabled={!settingsLoaded} />
      {message && <div className="mb-4 rounded-xl bg-[#E9F7EF] px-4 py-3 text-sm text-[#277A4B]">{message}</div>}
      {error && <div className="mb-4 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#B44335]">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2">
            <Bell size={16} className="text-[#2A3F8F]" /> ការជូនដំណឹង
          </h3>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            <ToggleRow label="ការជូនដំណឹងតាមអ៊ីមែល" desc="ផ្ញើព្រឹត្តិការណ៍ HR តាមអ៊ីមែលទៅអ្នកពាក់ព័ន្ធ" checked={emailNotif} onChange={set("emailNotif")} />
            <ToggleRow label="ការជូនដំណឹងក្នុងកម្មវិធី" desc="បង្ហាញសំណើរង់ចាំ និងការមកយឺតក្នុង topbar" checked={pushNotif} onChange={set("pushNotif")} />
          </div>
          <div className="mt-3 rounded-xl bg-[#F7F8FB] p-3 text-xs leading-relaxed text-[#5B5F73]">
            {!workerConfigured
              ? "Worker URL មិនទាន់បានកំណត់។ Email មិនអាចផ្ញើបានទេ។"
              : emailConfigured
                ? "Email provider បានភ្ជាប់រួច។ អ្នកអាចផ្ញើអ៊ីមែលសាកល្បង។"
                : "ត្រូវបន្ថែម RESEND_API_KEY និង NOTIFICATION_FROM_EMAIL ក្នុង Worker secrets/variables។"}
          </div>
          <button
            type="button"
            disabled={!emailNotif || !emailConfigured || action === "email"}
            onClick={() => runAction("email", testSystemEmail, "បានផ្ញើអ៊ីមែលសាកល្បងដោយជោគជ័យ")}
            className="mt-3 rounded-xl border border-[#D9DEEC] px-3 py-2 text-xs font-semibold text-[#2A3F8F] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {action === "email" ? "កំពុងផ្ញើ..." : "ផ្ញើអ៊ីមែលសាកល្បង"}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2">
            <Lock size={16} className="text-[#D9614F]" /> សុវត្ថិភាព
          </h3>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            <ToggleRow label="ចាក់សោស្វ័យប្រវត្តិ" desc="Logout គណនីបន្ទាប់ពីគ្មានសកម្មភាព" checked={autoLock} onChange={set("autoLock")} />
          </div>
          <div className="mt-3">
            <FieldLabel>រយៈពេលមុនចាក់សោ</FieldLabel>
            <SelectField
              disabled={!autoLock}
              options={SESSION_TIMEOUT_OPTIONS.map((option) => option.label)}
              value={timeoutLabel(sessionTimeoutMinutes)}
              onChange={(event) => {
                const option = SESSION_TIMEOUT_OPTIONS.find((item) => item.label === event.target.value);
                set("sessionTimeoutMinutes")(option?.value || 30);
              }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#8A8FA3]">
            ការកំណត់នេះអនុវត្តលើ Admin, HR, Employee និង Kiosk ទាំងអស់។
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2">
            <Wrench size={16} className="text-[#3FA66B]" /> ការបម្រុងទុកទិន្នន័យ
          </h3>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            <ToggleRow label="បម្រុងទុកទិន្នន័យស្វ័យប្រវត្តិ" desc="ប្រើ Firestore managed export ទៅ Google Cloud Storage" checked={autoBackup} onChange={set("autoBackup")} />
          </div>
          <div className="mt-3">
            <FieldLabel>ភាពញឹកញាប់</FieldLabel>
            <SelectField
              disabled={!autoBackup}
              options={BACKUP_FREQUENCY_OPTIONS.map((option) => option.label)}
              value={backupFrequencyLabel(backupFreq)}
              onChange={(event) => {
                const option = BACKUP_FREQUENCY_OPTIONS.find((item) => item.label === event.target.value);
                set("backupFreq")(option?.value || "daily");
              }}
            />
          </div>
          <div className="mt-3 rounded-xl bg-[#F7F8FB] p-3 text-xs leading-relaxed text-[#5B5F73]">
            <div>ស្ថានភាព: {backupStatusLabel(lastBackupStatus)}</div>
            <div>ចុងក្រោយ: {formatDateTime(lastBackupAt)}</div>
            {lastBackupError && <div className="mt-1 text-[#B44335]">{lastBackupError}</div>}
            {!backupConfigured && <div className="mt-1">ត្រូវកំណត់ FIRESTORE_BACKUP_BUCKET និង IAM permission ក្នុង Worker។</div>}
          </div>
          <button
            type="button"
            disabled={!backupConfigured || action === "backup"}
            onClick={() => runAction("backup", runSystemBackup, "បានចាប់ផ្ដើម Firestore backup ដោយជោគជ័យ")}
            className="mt-3 rounded-xl border border-[#D9DEEC] px-3 py-2 text-xs font-semibold text-[#2A3F8F] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {action === "backup" ? "កំពុងចាប់ផ្ដើម..." : "Backup ឥឡូវនេះ"}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2">
            <Sun size={16} className="text-[#E8A33D]" /> ការបង្ហាញ
          </h3>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            <ToggleRow label="ម៉ូតងងឹត" desc="ប្តូររូបរាងកម្មវិធីសម្រាប់អ្នកប្រើទាំងអស់" checked={darkMode} onChange={set("darkMode")} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#8A8FA3]">ភាសាត្រូវបានផ្លាស់ប្ដូរពី topbar ខាងលើ។</p>
        </div>
      </div>
    </>
  );
}
