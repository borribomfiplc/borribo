import React, { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Send, Server, ShieldCheck, XCircle } from "lucide-react";
import { loadSettingsDoc, saveSettingsDoc } from "../firebase/settingsDoc";
import { isTelegramWorkerConfigured, sendDailyTelegramSummary, testTelegramConnection } from "../services/telegram";

const defaults = {
  enabled: false,
  chatId: "",
  onCheckIn: true,
  onCheckOut: true,
  onLeaveRequest: true,
  onLeaveDecision: true,
  onLate: true,
  dailySummary: true,
  summaryTime: "17:30",
};

const summaryTimes = Array.from({ length: 29 }, (_, index) => {
  const total = 6 * 60 + index * 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
});

export default function TelegramBotPage({ outbox = [] }) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const workerConfigured = isTelegramWorkerConfigured();
  const recentOutbox = useMemo(
    () => [...outbox].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 20),
    [outbox],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const data = await loadSettingsDoc("telegram", defaults);
        if (!cancelled) { setSettings({ ...defaults, ...data }); setSettingsLoaded(true); }
      } catch (loadError) {
        if (!cancelled) { setSettingsLoaded(false); setMessage({ ok: false, text: loadError?.message || "មិនអាចទាញយកការកំណត់ Telegram បានទេ" }); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    if (!settingsLoaded) return;
    if (settings.chatId && !/^(-?\d+|@[A-Za-z0-9_]{5,})$/.test(settings.chatId.trim())) {
      setMessage({ ok: false, text: "Telegram Chat ID មិនត្រឹមត្រូវ" });
      return;
    }
    setBusy("save"); setMessage(null);
    try {
      await saveSettingsDoc("telegram", { ...settings, chatId: settings.chatId.trim() });
      setMessage({ ok: true, text: "បានរក្សាទុកការកំណត់រួច" });
    } catch (error) {
      setMessage({ ok: false, text: error.message || "មិនអាចរក្សាទុកបានទេ" });
    } finally { setBusy(""); }
  };

  const runTest = async () => {
    if (!settingsLoaded) return;
    if (!settings.chatId.trim()) { setMessage({ ok: false, text: "សូមបំពេញ Telegram Chat ID ជាមុន" }); return; }
    setBusy("test"); setMessage(null);
    try {
      await saveSettingsDoc("telegram", { ...settings, chatId: settings.chatId.trim() });
      await testTelegramConnection();
      setMessage({ ok: true, text: "បានផ្ញើ Test Message ទៅ Telegram ពិតប្រាកដ" });
    } catch (error) {
      setMessage({ ok: false, text: error.message || "មិនអាចផ្ញើ Telegram បានទេ" });
    } finally { setBusy(""); }
  };

  const runSummary = async () => {
    if (!settingsLoaded) return;
    setBusy("summary"); setMessage(null);
    try {
      await saveSettingsDoc("telegram", { ...settings, chatId: settings.chatId.trim() });
      const result = await sendDailyTelegramSummary();
      setMessage({ ok: true, text: result.skipped === true ? "របាយការណ៍ថ្ងៃនេះបានផ្ញើរួចហើយ" : "បានផ្ញើរបាយការណ៍ប្រចាំថ្ងៃទៅ Telegram" });
    } catch (error) {
      setMessage({ ok: false, text: error.message || "មិនអាចផ្ញើរបាយការណ៍បានទេ" });
    } finally { setBusy(""); }
  };

  if (loading) return <div className="py-24 text-center text-sm text-[#8A8FA3]">កំពុងផ្ទុក...</div>;

  const toggles = [
    ["onCheckIn", "Check-in"],
    ["onCheckOut", "Check-out"],
    ["onLeaveRequest", "សំណើសុំច្បាប់ថ្មី"],
    ["onLeaveDecision", "ការអនុម័ត / បដិសេធច្បាប់"],
    ["onLate", "ជូនដំណឹងមកយឺត"],
    ["dailySummary", "របាយការណ៍វត្តមានប្រចាំថ្ងៃ"],
  ];

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">Telegram Bot</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">ផ្ញើការជូនដំណឹងពិតពី HRMS ទៅក្រុម Telegram</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EBEDF3]">
            <div>
              <h2 className="font-semibold text-[#1E2333]">ការកំណត់ជូនដំណឹង</h2>
              <p className="text-xs text-[#8A8FA3] mt-1">Bot Token រក្សាទុកជា Cloudflare Secret មិនស្ថិតក្នុង Website ទេ។</p>
            </div>
            <button type="button" aria-label="បើក ឬបិទ Telegram" onClick={() => setSettings({ ...settings, enabled: !settings.enabled })} className={`shrink-0 w-11 h-6 rounded-full transition-colors ${settings.enabled ? "bg-[#3FA66B]" : "bg-[#D9DCE6]"}`}>
              <span className={`block w-5 h-5 rounded-full bg-white mx-0.5 transition-transform ${settings.enabled ? "translate-x-5" : ""}`} />
            </button>
          </div>

          <label className="block text-xs text-[#5B5F73] mt-4">
            Telegram Group Chat ID
            <input value={settings.chatId} onChange={(event) => setSettings({ ...settings, chatId: event.target.value })} placeholder="ឧ. -1001234567890" dir="ltr" className="mt-1 w-full bg-[#F5F6FA] rounded-xl px-3 py-2.5 text-sm outline-none" />
          </label>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            {toggles.map(([key, label]) => (
              <label key={key} className="py-3 flex items-center justify-between gap-3 text-sm text-[#1E2333] border-b border-[#EBEDF3]">
                <span>{label}</span>
                <input type="checkbox" checked={Boolean(settings[key])} onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })} className="w-4 h-4 accent-[#2A3F8F]" />
              </label>
            ))}
          </div>

          {settings.dailySummary && (
            <label className="block text-xs text-[#5B5F73] mt-4 max-w-xs">
              ម៉ោងផ្ញើរបាយការណ៍ (ម៉ោងកម្ពុជា)
              <select value={settings.summaryTime} onChange={(event) => setSettings({ ...settings, summaryTime: event.target.value })} className="mt-1 w-full bg-[#F5F6FA] rounded-xl px-3 py-2.5 text-sm outline-none">
                {summaryTimes.map((time) => <option key={time}>{time}</option>)}
              </select>
            </label>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            <button disabled={Boolean(busy) || !settingsLoaded} onClick={save} className="bg-[#2A3F8F] text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60">{busy === "save" ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}</button>
            <button disabled={Boolean(busy) || !settingsLoaded || !workerConfigured} onClick={runTest} className="border border-[#EBEDF3] text-[#2A3F8F] rounded-xl px-4 py-2.5 text-sm font-semibold flex gap-2 items-center disabled:opacity-50"><Send size={15} />{busy === "test" ? "កំពុងផ្ញើ..." : "ផ្ញើ Test ពិត"}</button>
            <button disabled={Boolean(busy) || !settingsLoaded || !workerConfigured} onClick={runSummary} className="border border-[#EBEDF3] text-[#2A3F8F] rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy === "summary" ? "កំពុងផ្ញើ..." : "ផ្ញើ Report ឥឡូវ"}</button>
          </div>
          {message && <p className={`mt-3 text-sm rounded-xl px-3 py-2 ${message.ok ? "text-[#257C4B] bg-[#E9F7EF]" : "text-[#B84637] bg-[#FBEBE8]"}`}>{message.text}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5">
          <div className={`rounded-xl px-3 py-2.5 text-sm flex items-center gap-2 ${workerConfigured ? "bg-[#E9F7EF] text-[#257C4B]" : "bg-[#FDF3E3] text-[#B97913]"}`}>
            {workerConfigured ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            {workerConfigured ? "Website បានកំណត់ Worker URL" : "មិនទាន់កំណត់ Worker URL"}
          </div>
          <ShieldCheck className="text-[#2A3F8F] mt-5 mb-2" size={22} />
          <h2 className="font-semibold text-[#1E2333]">សុវត្ថិភាព</h2>
          <p className="mt-2 text-xs leading-5 text-[#8A8FA3]">Worker ផ្ទៀងផ្ទាត់ Firebase Login និង Role មុនផ្ញើសារ។ Bot Token និង Firebase Private Key ជា Secret ហើយមិនត្រូវ push ទៅ GitHub ឬដាក់ក្នុង frontend `.env` ទេ។</p>
          <Server className="text-[#2A3F8F] mt-5 mb-2" size={21} />
          <h3 className="font-semibold text-sm text-[#1E2333]">សារស្វ័យប្រវត្តិ</h3>
          <p className="mt-2 text-xs leading-5 text-[#8A8FA3]">Check-in/out, មកយឺត, សំណើច្បាប់, ការសម្រេច និងរបាយការណ៍ប្រចាំថ្ងៃ។ សារដដែលមិនត្រូវផ្ញើស្ទួនទេ។</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden mt-5">
        <div className="px-4 sm:px-5 py-4 flex gap-2 items-center font-semibold text-[#1E2333]"><Bell size={17} className="text-[#2A3F8F]" /> ប្រវត្តិផ្ញើ Telegram</div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#F7F8FB] text-xs text-[#8A8FA3]"><th className="text-right px-5 py-3">សារ</th><th className="text-right px-5 py-3">ប្រភេទ</th><th className="text-right px-5 py-3">ស្ថានភាព</th><th className="text-right px-5 py-3">ពេលវេលា</th></tr></thead>
            <tbody>{recentOutbox.map((item) => <tr key={item.id} className="border-t border-[#EBEDF3]"><td className="px-5 py-3 max-w-xl whitespace-pre-line">{item.message}</td><td className="px-5 py-3">{item.type}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${item.status === "បានផ្ញើ" ? "bg-[#E9F7EF] text-[#257C4B]" : "bg-[#FBEBE8] text-[#B84637]"}`}>{item.status}</span></td><td className="px-5 py-3 text-[#8A8FA3] whitespace-nowrap">{String(item.createdAt || "").slice(0, 16).replace("T", " ")}</td></tr>)}{!recentOutbox.length && <tr><td colSpan="4" className="text-center py-10 text-[#8A8FA3]">មិនទាន់មានប្រវត្តិផ្ញើទេ</td></tr>}</tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-[#EBEDF3]">
          {recentOutbox.map((item) => <div key={item.id} className="p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-[#2A3F8F]">{item.type}</span><span className={`rounded-full px-2.5 py-1 text-[11px] ${item.status === "បានផ្ញើ" ? "bg-[#E9F7EF] text-[#257C4B]" : "bg-[#FBEBE8] text-[#B84637]"}`}>{item.status}</span></div><p className="text-xs text-[#5B5F73] whitespace-pre-line mt-2 line-clamp-4">{item.message}</p><p className="text-[11px] text-[#B4B7C6] mt-2">{String(item.createdAt || "").slice(0, 16).replace("T", " ")}</p></div>)}
          {!recentOutbox.length && <p className="text-center py-10 text-sm text-[#8A8FA3]">មិនទាន់មានប្រវត្តិផ្ញើទេ</p>}
        </div>
      </div>
    </>
  );
}
