import React, { useEffect, useState } from "react";
import {
  Clock
} from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, TextField } from "../components/shared/FormFields";
import { SettingsSaveBar } from "../components/shared/SettingsWidgets";
import { loadSettingsDoc, saveSettingsDoc } from "../firebase/settingsDoc";
import { DEFAULT_WORKING_HOURS } from "../utils/attendance";

export default function WorkingHoursPage() {
  const [schedules, setSchedules] = useState(DEFAULT_WORKING_HOURS.schedules);
  const [workDays, setWorkDays] = useState(DEFAULT_WORKING_HOURS.workDays);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadSettingsDoc("workingHours", DEFAULT_WORKING_HOURS).then((data) => {
      if (!cancelled) {
        setSchedules({
          weekday: {
            ...DEFAULT_WORKING_HOURS.schedules.weekday,
            ...(data.shifts?.morning || {}),
            ...(data.schedules?.weekday || {}),
          },
          saturday: {
            ...DEFAULT_WORKING_HOURS.schedules.saturday,
            ...(data.schedules?.saturday || {}),
          },
        });
        setWorkDays(Array.isArray(data.workDays) ? data.workDays : DEFAULT_WORKING_HOURS.workDays);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const days = ["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍", "អាទិត្យ"];

  const updateSchedule = (schedule, key) => (e) =>
    setSchedules((current) => ({ ...current, [schedule]: { ...current[schedule], [key]: e.target.value } }));

  const toggleDay = (d) =>
    setWorkDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));

  const handleSave = async () => {
    const invalidSchedule = Object.values(schedules).some((schedule) => {
      const start = Number(schedule.start?.replace(":", ""));
      const end = Number(schedule.end?.replace(":", ""));
      return !schedule.start || !schedule.end || start >= end || Number(schedule.grace) < 0;
    });
    if (invalidSchedule || workDays.length === 0) {
      setError("សូមកំណត់ម៉ោងចេញឱ្យក្រោយម៉ោងចូល រយៈពេលអនុគ្រោះមិនអវិជ្ជមាន និងជ្រើសថ្ងៃធ្វើការយ៉ាងហោចណាស់ ១ ថ្ងៃ");
      return;
    }
    try {
      setError("");
      await saveSettingsDoc("workingHours", { schedules, workDays });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("មិនអាចរក្សាទុកម៉ោងធ្វើការបានទេ។ សូមព្យាយាមម្ដងទៀត");
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-sm text-[#8A8FA3]">កំពុងផ្ទុក...</div>;
  }

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ម៉ោងធ្វើការ</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">កំណត់ម៉ោងធ្វើការតាមថ្ងៃ រយៈពេលអនុគ្រោះ និងថ្ងៃធ្វើការ</p>
      </div>
      <SettingsSaveBar onSave={handleSave} saved={saved} />
      {error && <p className="mb-4 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#D9614F]">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4 flex items-center gap-2">
            <Clock size={16} className="text-[#2A3F8F]" /> ចន្ទ–សុក្រ · ពេញមួយថ្ងៃ
          </h3>
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>ម៉ោងចូល</FieldLabel>
                <TextField type="time" dir="ltr" value={schedules.weekday.start} onChange={updateSchedule("weekday", "start")} />
              </div>
              <div>
                <FieldLabel>ម៉ោងចេញ</FieldLabel>
                <TextField type="time" dir="ltr" value={schedules.weekday.end} onChange={updateSchedule("weekday", "end")} />
              </div>
            </div>
            <div>
              <FieldLabel>រយៈពេលអនុគ្រោះ (នាទី)</FieldLabel>
              <TextField type="number" min="0" dir="ltr" value={schedules.weekday.grace} onChange={updateSchedule("weekday", "grace")} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4 flex items-center gap-2">
            <Clock size={16} className="text-[#8B5CF6]" /> សៅរ៍ · កន្លះថ្ងៃ
          </h3>
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>ម៉ោងចូល</FieldLabel>
                <TextField type="time" dir="ltr" value={schedules.saturday.start} onChange={updateSchedule("saturday", "start")} />
              </div>
              <div>
                <FieldLabel>ម៉ោងចេញ</FieldLabel>
                <TextField type="time" dir="ltr" value={schedules.saturday.end} onChange={updateSchedule("saturday", "end")} />
              </div>
            </div>
            <div>
              <FieldLabel>រយៈពេលអនុគ្រោះ (នាទី)</FieldLabel>
              <TextField type="number" min="0" dir="ltr" value={schedules.saturday.grace} onChange={updateSchedule("saturday", "grace")} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
        <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4">ថ្ងៃធ្វើការ</h3>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
              style={
                workDays.includes(d)
                  ? { background: COLORS.primaryLight, color: COLORS.primary, borderColor: "transparent" }
                  : { background: "#fff", color: "#8A8FA3", borderColor: COLORS.line }
              }
            >
              {d}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-[#8A8FA3]">Check-in/Check-out ថ្មីនឹងគណនា មកយឺត, ចេញមុន និងរយៈពេលធ្វើការ តាមការកំណត់នេះដោយស្វ័យប្រវត្តិ។</p>
      </div>
    </>
  );
}
