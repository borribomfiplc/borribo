import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScanLine, MapPin, ShieldCheck } from "lucide-react";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { FieldLabel, SelectField } from "../components/shared/FormFields";
import { ToggleRow, SettingsSaveBar } from "../components/shared/SettingsWidgets";
import { loadSettingsDoc } from "../firebase/settingsDoc";
import { db } from "../firebase/config";
import {
  createQrPayload, newQrCredential, publicQrCredential, qrCredentialExpired,
} from "../utils/qrSecurity";

const defaultRadii = (branches) => Object.fromEntries(branches.map((branch) => [
  branch.id, String(branch.gpsRadiusMeters || 100),
]));
const defaultLocations = (branches) => Object.fromEntries(branches.map((branch) => [branch.id, {
  latitude: branch.latitude ?? "", longitude: branch.longitude ?? "",
}]));
const coordinateValue = (value) => String(value ?? "").trim() === "" ? "" : Number(value);
const configuredValue = (primary, fallback = "") => String(primary ?? "").trim() === "" ? fallback : primary;

export default function GpsQrPage({ branches = [] }) {
  const [radii, setRadii] = useState(() => defaultRadii(branches));
  const [requireQr, setRequireQr] = useState(true);
  const [requireGps, setRequireGps] = useState(true);
  const [maxGpsAccuracy, setMaxGpsAccuracy] = useState("100");
  const [qrInterval, setQrInterval] = useState("ប្រចាំថ្ងៃ");
  const [loadedInterval, setLoadedInterval] = useState("ប្រចាំថ្ងៃ");
  const [saved, setSaved] = useState(false);
  const [regenerated, setRegenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [qrTokens, setQrTokens] = useState({});
  const [locations, setLocations] = useState(() => defaultLocations(branches));
  const [qrBranchId, setQrBranchId] = useState("");
  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.status !== "អសកម្ម"),
    [branches],
  );
  const branchKey = branches.map((branch) => [
    branch.id, branch.status, branch.latitude, branch.longitude, branch.gpsRadiusMeters,
  ].join(":")).join("|");

  const persistConfiguration = useCallback(async ({ tokens, interval = qrInterval }) => {
    const publicCredentials = await Promise.all(
      activeBranches.map(async (branch) => [branch.id, await publicQrCredential(tokens[branch.id], interval)]),
    );
    const branchGeofences = Object.fromEntries(activeBranches.map((branch) => [branch.id, {
      branchId: branch.id,
      name: branch.name,
      latitude: coordinateValue(locations[branch.id]?.latitude),
      longitude: coordinateValue(locations[branch.id]?.longitude),
      radiusMeters: Number(radii[branch.id]),
      active: true,
    }]));
    const batch = writeBatch(db);
    batch.set(doc(db, "settings", "gpsQr"), {
      radii, requireQr, requireGps, maxGpsAccuracy, qrInterval: interval, qrTokens: tokens, locations,
      branchGeofences, updatedAt: serverTimestamp(),
    }, { merge: true });
    batch.set(doc(db, "settings", "gpsQrPublic"), {
      radii, requireQr, requireGps, maxGpsAccuracy, qrInterval: interval, locations,
      branchGeofences, updatedAt: serverTimestamp(),
    }, { merge: true });
    activeBranches.forEach((branch) => {
      batch.set(doc(db, "branches", branch.id), {
        latitude: coordinateValue(locations[branch.id]?.latitude),
        longitude: coordinateValue(locations[branch.id]?.longitude),
        gpsRadiusMeters: Number(radii[branch.id]),
        gpsUpdatedAt: serverTimestamp(),
      }, { merge: true });
    });
    publicCredentials.forEach(([branchId, credential]) => {
      batch.set(doc(db, "qrTokens", branchId), credential);
    });
    await batch.commit();
  }, [activeBranches, locations, maxGpsAccuracy, qrInterval, radii, requireGps, requireQr]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError("");
      const defaults = {
        radii: defaultRadii(branches), requireQr: true, requireGps: true,
        maxGpsAccuracy: "100", qrInterval: "ប្រចាំថ្ងៃ", qrTokens: {},
        locations: defaultLocations(branches),
      };
      const data = await loadSettingsDoc("gpsQr", defaults);
      if (!active) return;
      const interval = data.qrInterval || defaults.qrInterval;
      const tokens = {};
      let needsSync = false;
      activeBranches.forEach((branch) => {
        const stored = data.qrTokens?.[branch.id];
        if (stored && !qrCredentialExpired(stored)) tokens[branch.id] = stored;
        else {
          tokens[branch.id] = newQrCredential(branch.id, interval);
          needsSync = true;
        }
      });
      const nextRadii = Object.fromEntries(branches.map((branch) => [
        branch.id,
        String(branch.gpsRadiusMeters || data.radii?.[branch.id] || defaults.radii[branch.id] || 100),
      ]));
      const nextLocations = Object.fromEntries(branches.map((branch) => [branch.id, {
        latitude: configuredValue(branch.latitude, data.locations?.[branch.id]?.latitude ?? ""),
        longitude: configuredValue(branch.longitude, data.locations?.[branch.id]?.longitude ?? ""),
      }]));
      setRadii(nextRadii); setRequireQr(Boolean(data.requireQr)); setRequireGps(Boolean(data.requireGps));
      setMaxGpsAccuracy(String(data.maxGpsAccuracy || defaults.maxGpsAccuracy));
      setQrInterval(interval); setLoadedInterval(interval); setQrTokens(tokens); setLocations(nextLocations);
      setQrBranchId((current) => activeBranches.some((branch) => branch.id === current) ? current : activeBranches[0]?.id || "");
      setLoading(false);
      if (needsSync) {
        try {
          const publicCredentials = await Promise.all(activeBranches.map(async (branch) => [branch.id, await publicQrCredential(tokens[branch.id], interval)]));
          const batch = writeBatch(db);
          batch.set(doc(db, "settings", "gpsQr"), { qrTokens: tokens, qrInterval: interval }, { merge: true });
          batch.set(doc(db, "settings", "gpsQrPublic"), {
            radii: nextRadii, requireQr: Boolean(data.requireQr), requireGps: Boolean(data.requireGps),
            maxGpsAccuracy: String(data.maxGpsAccuracy || defaults.maxGpsAccuracy), qrInterval: interval, locations: nextLocations,
          }, { merge: true });
          publicCredentials.forEach(([branchId, credential]) => batch.set(doc(db, "qrTokens", branchId), credential));
          await batch.commit();
        } catch {
          if (active) setError("មិនអាចធ្វើសមកាលកម្ម QR បានទេ។ សូមចុចរក្សាទុកម្ដងទៀត");
        }
      }
    };
    load();
    return () => { active = false; };
  }, [branchKey]);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      if (!activeBranches.length) throw new Error("មិនមានសាខាសកម្មសម្រាប់កំណត់ GPS/QR ទេ");
      const radiusIsValid = activeBranches.every((branch) => (
        Number(radii[branch.id]) >= 20 && Number(radii[branch.id]) <= 5000
      ));
      const locationsAreValid = !requireGps || activeBranches.every((branch) => (
        String(locations[branch.id]?.latitude ?? "").trim() !== ""
        && String(locations[branch.id]?.longitude ?? "").trim() !== ""
        && Number.isFinite(Number(locations[branch.id]?.latitude))
        && Number(locations[branch.id]?.latitude) >= -90
        && Number(locations[branch.id]?.latitude) <= 90
        && Number.isFinite(Number(locations[branch.id]?.longitude))
        && Number(locations[branch.id]?.longitude) >= -180
        && Number(locations[branch.id]?.longitude) <= 180
      ));
      if (!radiusIsValid) throw new Error("កាំ GPS ត្រូវនៅចន្លោះ 20 ដល់ 5,000 ម៉ែត្រ");
      if (!locationsAreValid) throw new Error("សូមបំពេញ Latitude និង Longitude ត្រឹមត្រូវគ្រប់សាខាសកម្ម");
      if (Number(maxGpsAccuracy) < 10 || Number(maxGpsAccuracy) > 500) throw new Error("GPS Accuracy ត្រូវនៅចន្លោះ 10 ដល់ 500 ម៉ែត្រ");
      const tokens = qrInterval === loadedInterval ? qrTokens : Object.fromEntries(
        activeBranches.map((branch) => [branch.id, newQrCredential(branch.id, qrInterval)]),
      );
      await persistConfiguration({ tokens });
      setQrTokens(tokens); setLoadedInterval(qrInterval); setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setError(saveError.message || "មិនអាចរក្សាទុកបានទេ");
    } finally { setSaving(false); }
  };

  const handleRegenerate = async () => {
    if (!qrBranchId) return;
    setSaving(true); setError("");
    try {
      const tokens = { ...qrTokens, [qrBranchId]: newQrCredential(qrBranchId, qrInterval) };
      await persistConfiguration({ tokens });
      setQrTokens(tokens); setRegenerated(true);
      setTimeout(() => setRegenerated(false), 2000);
    } catch { setError("មិនអាចបង្កើត QR ថ្មីបានទេ"); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (loading || !activeBranches.length) return undefined;
    const timer = window.setInterval(async () => {
      const expired = activeBranches.filter((branch) => qrCredentialExpired(qrTokens[branch.id]));
      if (!expired.length) return;
      const tokens = { ...qrTokens };
      expired.forEach((branch) => { tokens[branch.id] = newQrCredential(branch.id, qrInterval); });
      try {
        await persistConfiguration({ tokens });
        setQrTokens(tokens);
      } catch { setError("QR បានផុតកំណត់ ប៉ុន្តែមិនអាចបង្កើតថ្មីបានទេ។ សូមពិនិត្យ Internet"); }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [activeBranches, loading, persistConfiguration, qrInterval, qrTokens]);

  const currentCredential = qrTokens[qrBranchId];
  const qrPayload = useMemo(() => currentCredential ? createQrPayload(currentCredential) : "", [currentCredential]);

  if (loading) return <div className="py-24 text-center text-sm text-[#8A8FA3]">កំពុងផ្ទុក...</div>;

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">GPS និង QR</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">កំណត់តំបន់ GPS និង QR មានថ្ងៃផុតកំណត់ដាច់ដោយឡែកតាមសាខា</p>
      </div>
      <SettingsSaveBar onSave={handleSave} saved={saved} />
      {saving && <p className="mb-3 text-xs text-[#2A3F8F]">កំពុងរក្សាទុក...</p>}
      {error && <p className="mb-4 rounded-xl bg-[#FBEBE8] px-3 py-2 text-sm text-[#D9614F]">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-1 flex items-center gap-2"><MapPin size={16} className="text-[#2A3F8F]" /> តំបន់ GPS តាមសាខា</h3>
          <p className="text-xs text-[#8A8FA3] mb-4">កំណត់កាំ និងទីតាំងពិតដែលបុគ្គលិកអាច Check-in/out បាន</p>
          <div className="flex flex-col divide-y divide-[#EBEDF3]">
            {activeBranches.map((branch) => (
              <div key={branch.id} className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-[minmax(140px,1fr)_112px] xl:grid-cols-[minmax(150px,1fr)_112px_220px] xl:items-center">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#1E2333]">{branch.name}</div>
                  <div className="truncate text-xs text-[#8A8FA3]">{branch.address}</div>
                  {locations[branch.id]?.latitude && locations[branch.id]?.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${locations[branch.id].latitude},${locations[branch.id].longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-[11px] text-[#2A3F8F] hover:underline"
                    >
                      បើកទីតាំងក្នុង Google Maps
                    </a>
                  )}
                </div>
                <label className="relative"><span className="sr-only">កាំ GPS</span><input type="number" min="1" dir="ltr" value={radii[branch.id] || ""} onChange={(event) => setRadii((value) => ({ ...value, [branch.id]: event.target.value }))} className="w-full bg-[#F5F6FA] rounded-xl px-3 pr-9 py-2 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#B4B7C6]">m</span></label>
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 sm:col-span-2 xl:col-span-1">
                  <input aria-label={`Latitude ${branch.name}`} type="number" step="any" value={locations[branch.id]?.latitude || ""} onChange={(event) => setLocations((value) => ({ ...value, [branch.id]: { ...value[branch.id], latitude: event.target.value } }))} placeholder="Latitude" className="min-w-0 bg-[#F5F6FA] rounded-xl px-3 py-2 text-xs outline-none" />
                  <input aria-label={`Longitude ${branch.name}`} type="number" step="any" value={locations[branch.id]?.longitude || ""} onChange={(event) => setLocations((value) => ({ ...value, [branch.id]: { ...value[branch.id], longitude: event.target.value } }))} placeholder="Longitude" className="min-w-0 bg-[#F5F6FA] rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
              </div>
            ))}
          </div>
          <ToggleRow label="តម្រូវឲ្យស្ថិតក្នុងតំបន់ GPS" desc="ត្រួតពិនិត្យទីតាំង GPS ទាំង Check-in និង Check-out" checked={requireGps} onChange={setRequireGps} />
          <div className="max-w-xs pt-3"><FieldLabel>GPS Accuracy អតិបរមា (ម៉ែត្រ)</FieldLabel><input type="number" min="10" max="500" value={maxGpsAccuracy} onChange={(event) => setMaxGpsAccuracy(event.target.value)} className="w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 text-sm outline-none" /></div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 flex flex-col">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4 flex items-center gap-2"><ScanLine size={16} className="text-[#E8A33D]" /> កូដ QR</h3>
          <select value={qrBranchId} onChange={(event) => setQrBranchId(event.target.value)} className="w-full mb-3 rounded-xl bg-[#F5F6FA] px-3 py-2 text-xs outline-none">{activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
          <div className="w-full aspect-square max-w-[220px] mx-auto rounded-2xl bg-white border border-[#EBEDF3] flex items-center justify-center mb-3 p-3">{qrPayload && <QRCodeSVG value={qrPayload} size={196} level="M" includeMargin />}</div>
          <p className="mb-3 text-center text-[11px] text-[#8A8FA3]">ផុតកំណត់៖ {currentCredential?.expiresAt ? new Date(currentCredential.expiresAt).toLocaleString("km-KH") : "—"}</p>
          <ToggleRow label="តម្រូវឲ្យស្កេន QR" desc="QR ត្រូវនឹងសាខា និងមិនទាន់ផុតកំណត់" checked={requireQr} onChange={setRequireQr} />
          <div className="mt-1 mb-4"><FieldLabel>ថេរវេលាបង្កើត QR ថ្មី</FieldLabel><SelectField options={["ប្រចាំថ្ងៃ", "ប្រចាំសប្តាហ៍", "ប្រចាំខែ"]} value={qrInterval} onChange={(event) => setQrInterval(event.target.value)} /></div>
          <button disabled={saving || !qrBranchId} onClick={handleRegenerate} className="mt-auto flex items-center justify-center gap-2 border border-[#EBEDF3] rounded-xl py-2.5 text-sm font-medium text-[#2A3F8F] disabled:opacity-50"><ScanLine size={15} />{regenerated ? "បានបង្កើត QR ថ្មីរួចរាល់!" : "បង្កើត QR ថ្មី"}</button>
          <p className="mt-3 flex gap-1.5 text-[11px] leading-relaxed text-[#8A8FA3]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#3FA66B]" /> Employee អាចអានតែ QR hash មិនអាចអាន token ពិតពី Firebase បានទេ។</p>
        </div>
      </div>
    </>
  );
}
