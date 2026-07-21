import { useCallback, useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "./config";

/**
 * Drop-in replacement for `useState(initialArray)` that is backed by a
 * Firestore collection instead of local memory, so every screen that reads
 * or writes this data stays in sync in real time (including across tabs/
 * devices) without changing how pages call the setter.
 *
 * Usage is identical to useState:
 *   const [employees, setEmployees] = useFirestoreCollection("employees", initialEmployees);
 *   setEmployees((list) => [newEmployee, ...list]);   // add
 *   setEmployees((list) => list.map(...));            // update
 *   setEmployees((list) => list.filter(...));         // delete
 *
 * How it works:
 * - Subscribes to the collection with onSnapshot for real-time data.
 * - Production data must be seeded by the admin script. The browser never
 *   writes demo records automatically: an authenticated employee must not be
 *   able to populate or overwrite a new database.
 * - The returned setter diffs the next array against the current one by
 *   `idField` and writes only the adds/updates/removes to Firestore in a
 *   single batch; the UI then updates from the next onSnapshot event, so
 *   all instances of this hook (e.g. other open tabs) stay consistent.
 *
 * @param {string} collectionName Firestore collection name.
 * @param {Array<object>} seedData Initial data used only to seed an empty collection.
 * @param {string} idField Field on each item that becomes the Firestore doc ID.
 * @returns {[Array<object>, Function, boolean, Error|null]} [data, setData, loading, error]
 */
export function useFirestoreCollection(collectionName, seedData = [], idField = "id", enabled = true) {
  const [data, setDataState] = useState(seedData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!enabled) {
      setDataState([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    const colRef = collection(db, collectionName);

    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        setDataState(snapshot.docs.map((d) => d.data()));
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error(`[firestore] Listener error on "${collectionName}":`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled]);

  const setData = useCallback(
    async (updater) => {
      if (!enabled) throw new Error(`No permission to write ${collectionName}`);
      const prev = dataRef.current;
      const next = typeof updater === "function" ? updater(prev) : updater;

      const prevIds = new Set(prev.map((item) => String(item[idField])));
      const nextIds = new Set(next.map((item) => String(item[idField])));

      const batch = writeBatch(db);
      next.forEach((item) => {
        batch.set(doc(db, collectionName, String(item[idField])), item);
      });
      prevIds.forEach((id) => {
        if (!nextIds.has(id)) batch.delete(doc(db, collectionName, id));
      });

      // Optimistic local update so the UI feels instant; onSnapshot will
      // reconcile with the server value shortly after.
      setDataState(next);
      try {
        await batch.commit();
        return next;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[firestore] Write failed on "${collectionName}":`, err);
        setError(err);
        setDataState(prev); // roll back optimistic update
        // Let the page that initiated the save display a useful error to the
        // person using the system. Previously this error was swallowed, which
        // made a failed Firebase write look like a successful save.
        throw err;
      }
    },
    [collectionName, enabled, idField]
  );

  return [data, setData, loading, error];
}
