import React, { useEffect, useState } from "react";
import {
  Bell, Sun, Wrench, Lock
} from "lucide-react";
import { FieldLabel, SelectField } from "../components/shared/FormFields";
import { ToggleRow, SettingsSaveBar } from "../components/shared/SettingsWidgets";
import { loadSettingsDoc, saveSettingsDoc } from "../firebase/settingsDoc";

const DEFAULT_SYSTEM_SETTINGS = {
  emailNotif: true,
  pushNotif: true,
  autoLock: true,
  autoBackup: true,
  darkMode: false,
  sessionTimeout: "៣០ នាទី",
  backupFreq: "ប្រចាំថ្ងៃ",
};

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSettingsDoc("system", DEFAULT_SYSTEM_SETTINGS).then((data) => {
      if (!cancelled) {
        setSettings(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const {
    emailNotif, pushNotif, autoLock, autoBackup, darkMode,
    sessionTimeout, backupFreq,
  } = settings;
  const set = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }));

  const handleSave = async () => {
    await saveSettingsDoc("system", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return <div className="py-24 text-center text-sm text-[#8A8FA3]">កំពុងផ្ទុក...</div>;
  }

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ប្រព័ន្ធ</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">ការជូនដំណឹង សុវត្ថិភាព ការបង្ហាញ និងការបម្រុងទុកទិន្នន័យ</p>
      </div>
      <SettingsSaveBar onSave={handleSave} saved={saved} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2">
            <Bell size={16} className="text-[#2A3F8F]" /> ការជូនដំណឹង
          </h3>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            <ToggleRow label="ការជូនដំណឹងតាមអ៊ីមែល" desc="ទទួលការជូនដំណឹងសម្រាប់សំណើថ្មីៗ" checked={emailNotif} onChange={set("emailNotif")} />
            <ToggleRow label="ការជូនដំណឹងក្នុងកម្មវិធី" desc="ការជូនដំណឹងផុសលេចឡើងក្នុងកម្មវិធី" checked={pushNotif} onChange={set("pushNotif")} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2">
            <Lock size={16} className="text-[#D9614F]" /> សុវត្ថិភាព
          </h3>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            <ToggleRow label="ចាក់សោស្វ័យប្រវត្តិ" desc="ចាក់សោគណនីបន្ទាប់ពីអសកម្មភាព" checked={autoLock} onChange={set("autoLock")} />
          </div>
          <div className="mt-3">
            <FieldLabel>រយៈពេលមុនចាក់សោ</FieldLabel>
            <SelectField options={["១៥ នាទី", "៣០ នាទី", "១ ម៉ោង"]} value={sessionTimeout} onChange={(e) => set("sessionTimeout")(e.target.value)} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2">
            <Wrench size={16} className="text-[#3FA66B]" /> ការបម្រុងទុកទិន្នន័យ
          </h3>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            <ToggleRow label="បម្រុងទុកទិន្នន័យស្វ័យប្រវត្តិ" desc="បម្រុងទុកទិន្នន័យប្រព័ន្ធដោយស្វ័យប្រវត្តិ" checked={autoBackup} onChange={set("autoBackup")} />
          </div>
          <div className="mt-3">
            <FieldLabel>ភាពញឹកញាប់</FieldLabel>
            <SelectField options={["ប្រចាំថ្ងៃ", "ប្រចាំសប្តាហ៍", "ប្រចាំខែ"]} value={backupFreq} onChange={(e) => set("backupFreq")(e.target.value)} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2">
            <Sun size={16} className="text-[#E8A33D]" /> ការបង្ហាញ
          </h3>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            <ToggleRow label="ម៉ូតងងឹត" desc="ប្តូររូបរាងកម្មវិធីទៅជាពណ៌ងងឹត" checked={darkMode} onChange={set("darkMode")} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#8A8FA3]">ភាសាត្រូវបានផ្លាស់ប្ដូរពី topbar ខាងលើ។</p>
        </div>
      </div>
    </>
  );
}
