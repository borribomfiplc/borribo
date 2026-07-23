import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./config";

/**
 * Real-time reader for a single Firestore settings document.
 * It never creates or writes a document, so it is safe for public settings
 * documents that ordinary active accounts may only read.
 */
export function useSettingsDoc(docId, defaults, enabled = true, normalize = (value) => value) {
  const [data, setData] = useState(() => normalize(defaults));
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setData(normalize(defaults));
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "settings", docId),
      (snapshot) => {
        const value = snapshot.exists() ? snapshot.data() : {};
        setData(normalize({ ...defaults, ...value }));
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        console.error(`[firestore] Listener error on settings/${docId}:`, snapshotError);
        setData(normalize(defaults));
        setLoading(false);
        setError(snapshotError);
      },
    );

    return unsubscribe;
  }, [docId, enabled]);

  return [data, loading, error];
}
