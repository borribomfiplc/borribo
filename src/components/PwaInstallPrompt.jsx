import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

function isInstalled() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("borribo-pwa-dismissed") === "true");
  const [installed, setInstalled] = useState(() => isInstalled());
  const isIos = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem("borribo-pwa-dismissed", "true");
    setDismissed(true);
  };

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    if (isIos) {
      window.alert("លើ iPhone/iPad សូមចុច Share ក្នុង Safari ហើយជ្រើស ‘Add to Home Screen’ ដើម្បីដំឡើង BORRIBO HRMS។");
    }
  };

  if (installed || dismissed || (!installPrompt && !isIos)) return null;

  return (
    <div className="fixed z-50 bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-[360px] rounded-2xl border border-[#D9DEEF] bg-white p-4 shadow-xl" role="status">
      <button onClick={dismiss} className="absolute right-2 top-2 rounded-lg p-1.5 text-[#8A8FA3] hover:bg-[#F5F6FA]" aria-label="បិទការណែនាំដំឡើង"><X size={17} /></button>
      <div className="flex items-start gap-3 pr-5">
        <img src="/pwa-192x192.png" alt="BORRIBO HRMS" className="h-11 w-11 rounded-xl" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#1E2333]">ដំឡើង BORRIBO HRMS</div>
          <p className="mt-0.5 text-xs leading-5 text-[#5B5F73]">ប្រើដូចជា App លើទូរស័ព្ទ ឬ Computer និងបើកបានលឿនជាងមុន។</p>
        </div>
      </div>
      <button onClick={install} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2A3F8F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#21347A]">
        <Download size={17} /> ដំឡើង App
      </button>
    </div>
  );
}
