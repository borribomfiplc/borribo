import React, { useEffect, useState } from "react";
import {
  ScanLine, MapPin
} from "lucide-react";
import { FieldLabel, SelectField } from "../components/shared/FormFields";
import { ToggleRow, SettingsSaveBar } from "../components/shared/SettingsWidgets";
import { loadSettingsDoc, saveSettingsDoc } from "../firebase/settingsDoc";

export default function GpsQrPage({ branches }) {
  const [radii, setRadii] = useState(Object.fromEntries(branches.map((b) => [b.id, "150"])));
  const [requireQr, setRequireQr] = useState(true);
  const [requireGps, setRequireGps] = useState(true);
  const [qrInterval, setQrInterval] = useState("ប្រចាំថ្ងៃ");
  const [saved, setSaved] = useState(false);
  const [regenerated, setRegenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrToken, setQrToken] = useState("");

  useEffect(() => {
    const defaults = {
      radii: Object.fromEntries(branches.map((b) => [b.id, "150"])),
      requireQr: true,
      requireGps: true,
      qrInterval: "ប្រចាំថ្ងៃ",
      qrToken: crypto.randomUUID(),
    };
    loadSettingsDoc("gpsQr", defaults).then((data) => {
      setRadii({ ...defaults.radii, ...(data.radii || {}) });
      setRequireQr(Boolean(data.requireQr));
      setRequireGps(Boolean(data.requireGps));
      setQrInterval(data.qrInterval || defaults.qrInterval);
      setQrToken(data.qrToken || defaults.qrToken);
      setLoading(false);
    });
  }, [branches]);

  const handleSave = async () => {
    await saveSettingsDoc("gpsQr", { radii, requireQr, requireGps, qrInterval, qrToken });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  const handleRegenerate = async () => {
    const nextToken = crypto.randomUUID();
    setQrToken(nextToken);
    await saveSettingsDoc("gpsQr", { radii, requireQr, requireGps, qrInterval, qrToken: nextToken });
    setRegenerated(true);
    setTimeout(() => setRegenerated(false), 2000);
  };

  if (loading) return <div className="py-24 text-center text-sm text-[#8A8FA3]">កំពុងផ្ទុក...</div>;

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">GPS និង QR</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">កំណត់តំបន់ GPS សម្រាប់ស្កេនវត្តមាន និងកូដ QR របស់សាខា</p>
      </div>
      <SettingsSaveBar onSave={handleSave} saved={saved} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2">
            <MapPin size={16} className="text-[#2A3F8F]" /> តំបន់ GPS តាមសាខា
          </h3>
          <p className="text-xs text-[#8A8FA3] mb-4">កំណត់កាំនៃតំបន់ (ម៉ែត្រ) ដែលបុគ្គលិកអាចស្កេនចូលធ្វើការបាន</p>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3 gap-4">
                <div>
                  <div className="text-sm font-medium text-[#1E2333]">{b.name}</div>
                  <div className="text-xs text-[#8A8FA3]">{b.address}</div>
                </div>
                <div className="w-28 shrink-0 relative">
                  <input
                    type="number"
                    dir="ltr"
                    value={radii[b.id]}
                    onChange={(e) => setRadii((r) => ({ ...r, [b.id]: e.target.value }))}
                    className="w-full bg-[#F5F6FA] rounded-xl px-3 pr-9 py-2 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#B4B7C6]">ម.</span>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-1">
            <ToggleRow label="តម្រូវឲ្យស្ថិតក្នុងតំបន់ GPS" desc="បិទបើកការត្រួតពិនិត្យទីតាំង GPS ពេលស្កេនចូល/ចេញ" checked={requireGps} onChange={setRequireGps} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5 flex flex-col">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4 flex items-center gap-2">
            <ScanLine size={16} className="text-[#E8A33D]" /> កូដ QR
          </h3>
          <div className="w-full aspect-square max-w-[160px] mx-auto rounded-2xl bg-[#F7F8FB] border border-[#EBEDF3] flex items-center justify-center mb-4">
            <ScanLine size={56} className="text-[#B4B7C6]" />
          </div>
          <p className="text-[10px] text-center text-[#8A8FA3] break-all mb-3" title={qrToken}>Token: {qrToken.slice(0, 12)}…</p>
          <ToggleRow label="តម្រូវឲ្យស្កេន QR" desc="ស្កេនកូដ QR របស់សាខាមុនកត់ត្រាវត្តមាន" checked={requireQr} onChange={setRequireQr} />
          <div className="mt-1 mb-4">
            <FieldLabel>ថេរវេលាបង្កើត QR ថ្មី</FieldLabel>
            <SelectField options={["ប្រចាំថ្ងៃ", "ប្រចាំសប្តាហ៍", "ប្រចាំខែ"]} value={qrInterval} onChange={(e) => setQrInterval(e.target.value)} />
          </div>
          <button
            onClick={handleRegenerate}
            className="mt-auto flex items-center justify-center gap-2 border border-[#EBEDF3] rounded-xl py-2.5 text-sm font-medium text-[#2A3F8F]"
          >
            <ScanLine size={15} />
            {regenerated ? "បានបង្កើត QR ថ្មីរួចរាល់!" : "បង្កើត QR ថ្មី"}
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-[#8A8FA3]">ការកំណត់នេះត្រូវបានរក្សាទុកពិត។ ការស្កេនកាមេរ៉ា និងការផ្ទៀងផ្ទាត់ GPS នឹងត្រូវភ្ជាប់ជាមួយ kiosk API នៅជំហានបន្ទាប់។</p>
        </div>
      </div>
    </>
  );
}
