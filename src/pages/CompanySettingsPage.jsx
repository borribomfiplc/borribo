import React, { useEffect, useState } from "react";
import { Building2, Settings, Camera, Mail, MapPin, Phone } from "lucide-react";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { FieldLabel, TextField, SelectField, SectionCard } from "../components/shared/FormFields";
import { SettingsSaveBar } from "../components/shared/SettingsWidgets";
import { loadSettingsDoc, saveSettingsDoc } from "../firebase/settingsDoc";
import { storage } from "../firebase/config";

const DEFAULT_COMPANY = {
  name: "MFI ហិរញ្ញវត្ថុ ភីអិលស៊ី",
  regNo: "Co. 1234/26E",
  phone: "023 456 000",
  email: "info@borribo.com.kh",
  website: "www.borribo.com.kh",
  address: "ផ្លូវ ២៧១, សង្កាត់ទឹកល្អក់, ខណ្ឌទួលគោក, ភ្នំពេញ",
  timezone: "ICT (UTC+7) ភ្នំពេញ",
  currency: "រៀល (KHR)",
  dateFormat: "dd/mm/yyyy",
  logoUrl: "",
  logoPath: "",
};

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function logoExtension(file) {
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type] || "png";
}

export default function CompanySettingsPage() {
  const [form, setForm] = useState(DEFAULT_COMPANY);
  const [loading, setLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await loadSettingsDoc("company", DEFAULT_COMPANY);
        if (cancelled) return;
        setForm(data);
        setLogoPreview(data.logoUrl || "");
        setSettingsLoaded(true);
      } catch (loadError) {
        if (!cancelled) { setSettingsLoaded(false); setError(loadError?.message || "មិនអាចទាញយកព័ត៌មានក្រុមហ៊ុនបានទេ"); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSave = async () => {
    if (saving || !settingsLoaded) return;
    setSaving(true);
    setError("");
    let uploadedPath = "";
    let settingsSaved = false;
    try {
      let nextForm = { ...form };
      const previousPath = form.logoPath;
      if (logoFile) {
        uploadedPath = `company/logo-${Date.now()}.${logoExtension(logoFile)}`;
        const logoRef = ref(storage, uploadedPath);
        await uploadBytes(logoRef, logoFile, { contentType: logoFile.type });
        const logoUrl = await getDownloadURL(logoRef);
        nextForm = { ...nextForm, logoUrl, logoPath: uploadedPath };
      }
      await saveSettingsDoc("company", nextForm);
      settingsSaved = true;
      setForm(nextForm);
      setLogoFile(null);
      if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
      setLogoPreview(nextForm.logoUrl || "");
      if (previousPath && uploadedPath && previousPath !== uploadedPath) {
        deleteObject(ref(storage, previousPath)).catch((deleteError) => {
          console.warn("Old company logo could not be deleted", deleteError);
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      if (uploadedPath && !settingsSaved) {
        deleteObject(ref(storage, uploadedPath)).catch(() => {});
      }
      setError(saveError.message || "មិនអាចរក្សាទុកព័ត៌មានក្រុមហ៊ុនបានទេ");
    } finally {
      setSaving(false);
    }
  };

  const chooseLogo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setError("Logo ត្រូវតែជា JPG, PNG ឬ WebP");
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setError("Logo មិនអាចធំជាង 2 MB បានទេ");
      return;
    }
    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setError("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  if (loading) {
    return <div className="py-24 text-center text-sm text-[#8A8FA3]">កំពុងផ្ទុក...</div>;
  }

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ក្រុមហ៊ុន</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">គ្រប់គ្រងព័ត៌មានទូទៅរបស់ក្រុមហ៊ុន</p>
      </div>
      <SettingsSaveBar onSave={handleSave} saved={saved} saving={saving} disabled={!settingsLoaded} />
      {error && <div className="mb-4 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#B44335]">{error}</div>}

      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-[#EEF1FB] text-[#2A3F8F] text-xl font-bold flex items-center justify-center shrink-0 overflow-hidden">
            {logoPreview
              ? <img src={logoPreview} alt="រូបសញ្ញាក្រុមហ៊ុន" className="w-full h-full object-contain p-1" />
              : form.name.slice(0, 1)}
          </div>
          <div>
            <div className="font-semibold text-[#1E2333] text-sm">{form.name}</div>
            <label className="cursor-pointer text-xs text-[#2A3F8F] font-medium mt-1 flex items-center gap-1.5">
              <Camera size={13} /> ប្តូររូបសញ្ញា
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseLogo} className="sr-only" />
            </label>
            <div className="mt-1 text-[11px] text-[#8A8FA3]">JPG, PNG ឬ WebP · អតិបរមា 2 MB</div>
          </div>
        </div>

        <SectionCard title="ព័ត៌មានក្រុមហ៊ុន" icon={Building2}>
          <div>
            <FieldLabel required>ឈ្មោះក្រុមហ៊ុន</FieldLabel>
            <TextField value={form.name} onChange={update("name")} />
          </div>
          <div>
            <FieldLabel>លេខចុះបញ្ជី</FieldLabel>
            <TextField dir="ltr" value={form.regNo} onChange={update("regNo")} />
          </div>
          <div>
            <FieldLabel>លេខទូរស័ព្ទ</FieldLabel>
            <TextField icon={Phone} dir="ltr" value={form.phone} onChange={update("phone")} />
          </div>
          <div>
            <FieldLabel>អ៊ីមែល</FieldLabel>
            <TextField icon={Mail} dir="ltr" value={form.email} onChange={update("email")} />
          </div>
          <div>
            <FieldLabel>គេហទំព័រ</FieldLabel>
            <TextField dir="ltr" value={form.website} onChange={update("website")} />
          </div>
        </SectionCard>

        <SectionCard title="អាសយដ្ឋាន" icon={MapPin}>
          <div className="md:col-span-2">
            <FieldLabel>អាសយដ្ឋានទីស្នាក់ការកណ្តាល</FieldLabel>
            <TextField icon={MapPin} value={form.address} onChange={update("address")} />
          </div>
        </SectionCard>

        <SectionCard title="ការកំណត់ទូទៅ" icon={Settings}>
          <div>
            <FieldLabel>ល្វែងម៉ោង</FieldLabel>
            <SelectField options={["ICT (UTC+7) ភ្នំពេញ"]} value={form.timezone} onChange={update("timezone")} />
          </div>
          <div>
            <FieldLabel>រូបិយប័ណ្ណ</FieldLabel>
            <SelectField options={["រៀល (KHR)", "ដុល្លារ (USD)"]} value={form.currency} onChange={update("currency")} />
          </div>
          <div>
            <FieldLabel>ទម្រង់កាលបរិច្ឆេទ</FieldLabel>
            <SelectField options={["dd/mm/yyyy", "mm/dd/yyyy", "yyyy-mm-dd"]} value={form.dateFormat} onChange={update("dateFormat")} />
          </div>
        </SectionCard>
      </div>
    </>
  );
}
