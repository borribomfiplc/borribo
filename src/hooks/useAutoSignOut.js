import { useEffect, useRef } from "react";

export const AUTO_SIGN_OUT_MS = 30 * 60 * 1000;
export const AUTO_SIGN_OUT_NOTICE_KEY = "borribo_hrms_auto_sign_out_notice";
const LAST_ACTIVITY_KEY = "borribo_hrms_last_activity";
const ACTIVITY_SYNC_INTERVAL_MS = 1000;

const ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "scroll",
  "touchstart",
];

/**
 * Signs an authenticated user out after a continuous period of inactivity.
 * Activity listeners are passive where possible and are removed on logout.
 */
export function useAutoSignOut(authUser, signOut, timeoutMs = AUTO_SIGN_OUT_MS) {
  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const signingOutRef = useRef(false);

  useEffect(() => {
    if (!authUser || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return undefined;

    signingOutRef.current = false;
    lastActivityRef.current = Date.now();
    let lastSyncedAt = 0;

    const getLastActivity = () => {
      try {
        const sharedActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
        return Math.max(lastActivityRef.current, Number.isFinite(sharedActivity) ? sharedActivity : 0);
      } catch {
        return lastActivityRef.current;
      }
    };

    const syncActivity = (timestamp) => {
      try {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
      } catch {
        // The timer remains fully functional in this tab without storage.
      }
    };

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const autoSignOut = async () => {
      if (signingOutRef.current) return;

      const lastActivity = getLastActivity();
      if (Date.now() - lastActivity < timeoutMs) {
        lastActivityRef.current = lastActivity;
        scheduleTimer();
        return;
      }

      signingOutRef.current = true;
      clearTimer();

      try {
        window.sessionStorage.setItem(AUTO_SIGN_OUT_NOTICE_KEY, JSON.stringify({
          timeoutMinutes: Math.max(1, Math.round(timeoutMs / 60000)),
        }));
      } catch {
        // Auto sign-out must still work when browser storage is unavailable.
      }

      try {
        await signOut();
      } catch (error) {
        signingOutRef.current = false;
        lastActivityRef.current = Date.now();
        scheduleTimer();
        console.error("Auto sign-out failed", error);
      }
    };

    const scheduleTimer = () => {
      clearTimer();
      const remaining = Math.max(0, timeoutMs - (Date.now() - getLastActivity()));
      timerRef.current = window.setTimeout(autoSignOut, remaining);
    };

    const recordActivity = () => {
      if (signingOutRef.current) return;
      const now = Date.now();
      lastActivityRef.current = now;

      // Pointer movement can fire many times per second. Sync and recreate the
      // timer at most once a second; the expiry callback always checks the
      // exact latest activity timestamp before signing out.
      if (now - lastSyncedAt >= ACTIVITY_SYNC_INTERVAL_MS) {
        lastSyncedAt = now;
        syncActivity(now);
        scheduleTimer();
      }
    };

    const syncActivityFromAnotherTab = (event) => {
      if (event.key !== LAST_ACTIVITY_KEY) return;
      const timestamp = Number(event.newValue);
      if (!Number.isFinite(timestamp) || timestamp <= lastActivityRef.current) return;
      lastActivityRef.current = timestamp;
      scheduleTimer();
    };

    const checkAfterVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        autoSignOut();
      } else {
        scheduleTimer();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    syncActivity(lastActivityRef.current);
    lastSyncedAt = lastActivityRef.current;
    window.addEventListener("storage", syncActivityFromAnotherTab);
    document.addEventListener("visibilitychange", checkAfterVisibilityChange);
    scheduleTimer();

    return () => {
      clearTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.removeEventListener("storage", syncActivityFromAnotherTab);
      document.removeEventListener("visibilitychange", checkAfterVisibilityChange);
    };
  }, [authUser?.uid, signOut, timeoutMs]);
}
