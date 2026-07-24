import { useCallback, useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "./config";

const demoDataEnabled = import.meta.env.DEV && String(import.meta.env.VITE_USE_DEMO_DATA || "").toLowerCase() === "true";

/**
 * Firestore-backed collection state.
 *
 * Demo records are never shown in a production build. To use local demo data
 * during development, explicitly set VITE_USE_DEMO_DATA=true.
 *
 * @returns {[Array<object>, Function, boolean, Error|null]}
 */
export function useFirestoreCollection(collectionName, seedData = [], idField = "id", enabled = true) {
  const seedDataRef = useRef(seedData);
  const [data, setDataState] = useState(() => (demoDataEnabled ? seedDataRef.current : []));
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const dataRef = useRef(data);
  const readyRef = useRef(!enabled);
  dataRef.current = data;

  useEffect(() => {
    readyRef.current = !enabled;
    if (!enabled) {
      setDataState([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const rows = snapshot.docs.map((item) => {
          const value = item.data();
          return value[idField] == null ? { ...value, [idField]: item.id } : value;
        });
        setDataState(rows.length || !demoDataEnabled ? rows : seedDataRef.current);
        readyRef.current = true;
        setLoading(false);
      },
      (listenerError) => {
        console.error(`[firestore] Listener error on "${collectionName}":`, listenerError);
        setDataState([]);
        readyRef.current = false;
        setError(listenerError);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [collectionName, enabled, idField]);

  const setData = useCallback(async (updater) => {
    if (!enabled) throw new Error(`No permission to write ${collectionName}`);
    if (!readyRef.current) throw new Error("ទិន្នន័យកំពុងផ្ទុក។ សូមរង់ចាំបន្តិច រួចព្យាយាមម្ដងទៀត។");

    const prev = dataRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (!Array.isArray(next)) throw new Error(`Invalid collection update for ${collectionName}`);

    const prevIds = new Set(prev.map((item) => String(item[idField])));
    const nextIds = new Set(next.map((item) => String(item[idField])));
    if ([...nextIds].some((id) => !id || id === "undefined" || id === "null")) {
      throw new Error(`Missing ${idField} in ${collectionName}`);
    }

    const protectedCollection = [
      "employees", "leaveRequests", "attendanceToday", "attendanceHistory", "corrections",
      "branches", "departments", "jobRoles", "holidays", "kpis", "assets",
      "staffLoans", "payrollRecords",
    ].includes(collectionName);
    if (protectedCollection) {
      throw new Error(`ការកែ ${collectionName} ត្រូវធ្វើតាម Worker service ដែលមាន validation និង audit log។`);
    }
    const upserts = [];
    const deletes = [];
    const previousById = new Map(prev.map((item) => [String(item[idField]), item]));

    next.forEach((item) => {
      const id = String(item[idField]);
      const previous = previousById.get(id);
      if (!previous || JSON.stringify(previous) !== JSON.stringify(item)) upserts.push({ id, data: item });
    });
    prevIds.forEach((id) => { if (!nextIds.has(id)) deletes.push(id); });

    setDataState(next);
    try {
      {
        const operations = [
          ...upserts.map(({ id, data: value }) => ({ type: "set", id, value })),
          ...deletes.map((id) => ({ type: "delete", id })),
        ];
        // Firestore permits at most 500 writes per batch. Keep headroom for
        // future metadata writes and commit safely in deterministic chunks.
        for (let index = 0; index < operations.length; index += 450) {
          const batch = writeBatch(db);
          operations.slice(index, index + 450).forEach((operation) => {
            const ref = doc(db, collectionName, operation.id);
            if (operation.type === "delete") batch.delete(ref);
            else batch.set(ref, operation.value);
          });
          await batch.commit();
        }
      }
      return next;
    } catch (writeError) {
      console.error(`[firestore] Write failed on "${collectionName}":`, writeError);
      setError(writeError);
      setDataState(prev);
      throw writeError;
    }
  }, [collectionName, enabled, idField]);

  return [data, setData, loading, error];
}
