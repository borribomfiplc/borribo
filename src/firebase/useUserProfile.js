import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./config";

/** Loads the signed-in user's server-managed profile. Never infer a role in the browser. */
export function useUserProfile(authUser) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(authUser));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);
    return onSnapshot(
      doc(db, "profiles", authUser.uid),
      (snap) => {
        setProfile(snap.exists() ? { uid: authUser.uid, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setProfile(null);
        setLoading(false);
      }
    );
  }, [authUser?.uid]);

  return { profile, loading, error };
}
