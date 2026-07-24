import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../firebase/config";

const MAX_READ_IDS = 120;

const normalizedIds = (values) => [...new Set((values || []).map(String).filter(Boolean))].slice(-MAX_READ_IDS);

export function useNotificationReadState(uid) {
  const [readList, setReadList] = useState([]);
  const readRef = useRef([]);
  const serverReadRef = useRef([]);

  useEffect(() => {
    readRef.current = readList;
  }, [readList]);

  useEffect(() => {
    if (!uid) {
      readRef.current = [];
      serverReadRef.current = [];
      setReadList([]);
      return undefined;
    }
    return onSnapshot(
      doc(db, "notificationStates", uid),
      (snapshot) => {
        const next = normalizedIds(snapshot.data()?.readIds);
        readRef.current = next;
        serverReadRef.current = next;
        setReadList(next);
      },
      (error) => console.error("Failed to read notification state", error),
    );
  }, [uid]);

  const persistAdd = useCallback(async (ids) => {
    if (!uid) return;
    const additions = normalizedIds(ids);
    if (!additions.length) return;

    // Optimistic UI prevents a notification from flashing as unread while the
    // transaction is in flight. The transaction then merges with the latest
    // server value so rapid clicks or multiple devices cannot overwrite one another.
    const optimistic = normalizedIds([...readRef.current, ...additions]);
    readRef.current = optimistic;
    setReadList(optimistic);

    const ref = doc(db, "notificationStates", uid);
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        const current = normalizedIds(snapshot.data()?.readIds);
        const next = normalizedIds([...current, ...additions]);
        transaction.set(ref, {
          uid,
          readIds: next,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
    } catch (error) {
      // Roll the optimistic state back to the last server snapshot. Without
      // this, an offline/permission failure could hide a notification until
      // the next full reload even though the read marker was never persisted.
      readRef.current = serverReadRef.current;
      setReadList(serverReadRef.current);
      throw error;
    }
  }, [uid]);

  const markRead = useCallback((id) => {
    persistAdd([id]).catch((error) => console.error("Failed to sync notification read state", error));
  }, [persistAdd]);

  const markAllRead = useCallback((ids) => {
    persistAdd(ids).catch((error) => console.error("Failed to sync notification read state", error));
  }, [persistAdd]);

  return {
    readIds: useMemo(() => new Set(readList), [readList]),
    markRead,
    markAllRead,
  };
}
