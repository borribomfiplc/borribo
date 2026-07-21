import React, { useState } from "react";
import {
  ScanLine, User, Eye, EyeOff, LogIn
} from "lucide-react";
import { COLORS } from "../data/theme";
import { login, authErrorMessage, sendPasswordReset } from "../firebase/auth";

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("សូមបំពេញឈ្មោះអ្នកប្រើប្រាស់ និងលេខសម្ងាត់");
      return;
    }
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      // App.jsx listens for the auth state change and switches to the
      // dashboard automatically — no local "loggedIn" flag needed here.
      await login(username.trim(), password, remember);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!username.trim()) {
      setError("សូមបញ្ចូលអ៊ីមែលរបស់អ្នកជាមុនសិន");
      return;
    }
    setError("");
    setNotice("");
    try {
      await sendPasswordReset(username.trim());
      setNotice("បានផ្ញើតំណប្តូរលេខសម្ងាត់ទៅអ៊ីមែលរបស់អ្នករួចហើយ");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    handleLogin();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        fontFamily: "'Noto Sans Khmer','Inter',sans-serif",
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, #4A5FC1 55%, #6C7FE0 100%)`,
      }}
    >
      <div className="w-full max-w-[920px] bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left brand panel */}
        <div
          className="hidden lg:flex flex-col justify-between p-10 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${COLORS.primary}, #3D50A8)` }}
        >
          <div
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20"
            style={{ background: COLORS.accent }}
          />
          <div
            className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full opacity-10"
            style={{ background: "#fff" }}
          />
          <div className="relative z-10">
            <div className="mb-10 inline-flex rounded-xl bg-white px-3 py-2 shadow-sm">
              <img src="/assets/borribo-logo.png" alt="BORRIBO MFI" className="w-52 h-auto object-contain" />
            </div>
            <h2 className="text-2xl font-bold leading-snug mb-3">
              ប្រព័ន្ធគ្រប់គ្រងវត្តមាន<br />និងច្បាប់ឈប់សម្រាក។
            </h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-[280px]">
              ធ្វើអោយជីវិតអ្នកកាន់តែប្រសើរ
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-6 text-xs text-white/60">
            <span>© 2026 BORRIBO MFI</span>
            <span>v1.0.0</span>
          </div>
        </div>

        {/* Right form panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="lg:hidden mb-8">
            <img src="/assets/borribo-logo.png" alt="BORRIBO MFI" className="w-48 h-auto object-contain object-left" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1E2333] mb-1.5">ចូលប្រើប្រព័ន្ធ</h1>
          <p className="text-sm text-[#8A8FA3] mb-7">សូមបញ្ចូលព័ត៌មានគណនីរបស់អ្នកដើម្បីបន្ត</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5B5F73] mb-1.5">
                ឈ្មោះអ្នកប្រើប្រាស់ ឬ អ៊ីមែល
              </label>
              <div className="relative">
                <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="bora.chhun@mfi.com"
                  className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-10 py-3 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/25 border border-transparent focus:border-[#2A3F8F]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5B5F73] mb-1.5">លេខសម្ងាត់</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6] hover:text-[#5B5F73]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-10 py-3 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/25 border border-transparent focus:border-[#2A3F8F]/20"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-[#D9614F] bg-[#FBEBE8] rounded-lg px-3 py-2">{error}</div>
            )}
            {notice && (
              <div className="text-xs text-[#25834A] bg-[#E9F7EF] rounded-lg px-3 py-2">{notice}</div>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[#5B5F73] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[#2A3F8F]"
                />
                ចងចាំខ្ញុំ
              </label>
              <button type="button" onClick={handlePasswordReset} className="text-[#2A3F8F] font-medium hover:underline">
                ភ្លេចលេខសម្ងាត់?
              </button>
            </div>

            <button
              type="submit"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-2 w-full text-white text-sm font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: COLORS.primary }}
            >
              <LogIn size={16} />
              {submitting ? "កំពុងចូល..." : "ចូលប្រើប្រព័ន្ធ"}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 border border-[#EBEDF3] rounded-xl py-3 text-xs text-[#8A8FA3] mt-4">
            <ScanLine size={16} /> Kiosk ត្រូវចូលដោយគណនី Kiosk ដែលបានកំណត់ដោយ Admin
          </div>

          <p className="text-xs text-[#B4B7C6] text-center mt-7">
            មានបញ្ហាចូលប្រើ? សូមទាក់ទងផ្នែក{" "}
            <span className="text-[#2A3F8F] font-medium">ព័ត៌មានវិទ្យា</span>
          </p>
        </div>
      </div>
    </div>
  );
}
