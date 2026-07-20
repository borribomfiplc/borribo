import React, { useEffect, useState } from "react";
import {
  Clock
} from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, TextField } from "../components/shared/FormFields";
import { SettingsSaveBar } from "../components/shared/SettingsWidgets";
import { loadSettingsDoc, saveSettingsDoc } from "../firebase/settingsDoc";

const DEFAULT_WORKING_HOURS = {
  shifts: {
    morning: { start: "08:00", end: "17:00", grace: "15" },
    evening: { start: "13:00", end: "21:00", grace: "15" },
  },
  workDays: ["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍"],
};

export default function WorkingHoursPage() {
  const [shifts, setShifts] = useState(DEFAULT_WORKING_HOURS.shifts);
  const [workDays, setWorkDays] = useState(DEFAULT_WORKING_HOURS.workDays);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSettingsDoc("workingHours", DEFAULT_WORKING_HOURS).then((data) => {
      if (!cancelled) {
        setShifts(data.shifts);
        setWorkDays(data.workDays);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const days = ["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍", "អាទិត្យ"];

  const updateShift = (shift, key) => (e) =>
    setShifts((s) => ({ ...s, [shift]: { ...s[shift], [key]: e.target.value } }));

  const toggleDay = (d) =>
    setWorkDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));

  const handleSave = async () => {
    await saveSettingsDoc("workingHours", { shifts, workDays });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return <div className="py-24 text-center text-sm text-[#8A8FA3]">កំពុងផ្ទុក...</div>;
  }

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ម៉ោងធ្វើការ</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">កំណត់វេនធ្វើការ រយៈពេលអនុគ្រោះ និងថ្ងៃធ្វើការ</p>
      </div>
      <SettingsSaveBar onSave={handleSave} saved={saved} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4 flex items-center gap-2">
            <Clock size={16} className="text-[#2A3F8F]" /> វេនព្រឹក
          </h3>
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>ម៉ោងចូល</FieldLabel>
                <TextField type="time" dir="ltr" value={shifts.morning.start} onChange={updateShift("morning", "start")} />
              </div>
              <div>
                <FieldLabel>ម៉ោងចេញ</FieldLabel>
                <TextField type="time" dir="ltr" value={shifts.morning.end} onChange={updateShift("morning", "end")} />
              </div>
            </div>
            <div>
              <FieldLabel>រយៈពេលអនុគ្រោះ (នាទី)</FieldLabel>
              <TextField type="number" dir="ltr" value={shifts.morning.grace} onChange={updateShift("morning", "grace")} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4 flex items-center gap-2">
            <Clock size={16} className="text-[#8B5CF6]" /> វេនល្ងាច
          </h3>
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>ម៉ោងចូល</FieldLabel>
                <TextField type="time" dir="ltr" value={shifts.evening.start} onChange={updateShift("evening", "start")} />
              </div>
              <div>
                <FieldLabel>ម៉ោងចេញ</FieldLabel>
                <TextField type="time" dir="ltr" value={shifts.evening.end} onChange={updateShift("evening", "end")} />
              </div>
            </div>
            <div>
              <FieldLabel>រយៈពេលអនុគ្រោះ (នាទី)</FieldLabel>
              <TextField type="number" dir="ltr" value={shifts.evening.grace} onChange={updateShift("evening", "grace")} />
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
      </div>
    </>
  );
}
