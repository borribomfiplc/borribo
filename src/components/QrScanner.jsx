import React, { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";

export default function QrScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
    reader.decodeFromConstraints(
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      videoRef.current,
      (result, scanError, controls) => {
        controlsRef.current = controls;
        if (active && result?.getText()) {
          controls.stop();
          onResult(result.getText());
        } else if (active && scanError?.name && scanError.name !== "NotFoundException") {
          setError("មិនអាចអាន QR បានទេ។ សូមដាក់កាមេរ៉ាឲ្យចំ QR");
        }
      },
    ).then((controls) => { controlsRef.current = controls; }).catch(() => {
      if (active) setError("មិនអាចបើកកាមេរ៉ាបានទេ។ សូមអនុញ្ញាត Camera ក្នុង Browser");
    });
    return () => {
      active = false;
      controlsRef.current?.stop();
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="ស្កេន QR">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EBEDF3] px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-[#1E2333]"><Camera size={18} /> ស្កេន QR សាខា</div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8A8FA3] hover:bg-[#F5F6FA]" aria-label="បិទកាមេរ៉ា"><X size={19} /></button>
        </div>
        <div className="relative aspect-[3/4] max-h-[68vh] bg-black sm:aspect-square">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-[14%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
        </div>
        <div className="px-4 py-3 text-center text-xs text-[#8A8FA3]">
          {error || "ដាក់ QR នៅក្នុងស៊ុម កាមេរ៉ានឹងស្កេនដោយស្វ័យប្រវត្តិ"}
        </div>
      </div>
    </div>
  );
}
