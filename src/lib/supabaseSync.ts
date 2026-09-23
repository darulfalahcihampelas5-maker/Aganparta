import { supabase, isSupabaseConfigured } from "./supabase";
import { db } from "./firebase";
import { doc, getDocs, collection, setDoc, getDoc, getDocsFromCache, getDocFromCache, deleteDoc } from "firebase/firestore";
import { clearTeacherCaches } from "./firestoreUtils";

let isFirebaseDisabled = false;

/**
 * Service to sync & read high-volume data (Grades & CBT Exams) with Supabase
 * with automatic fallback to Firestore if Supabase is offline or not yet migrated.
 */

export interface GradeItem {
  id: string;
  examId?: string;
  assignmentId?: string;
  nisn: string;
  studentName?: string;
  kelas?: string;
  nilai?: number;
  score?: number;
  submittedAt?: any;
  violationCount?: number;
  answers?: any;
  isRemedial?: boolean;
  remedialScore?: number;
  [key: string]: any;
}

export interface ExamItem {
  id: string;
  title: string;
  subject: string;
  kelasRef?: string;
  token: string;
  duration?: number;
  kkm?: number;
  questions?: any[];
  [key: string]: any;
}

// 1. Fetch all Final Grades (Unlimited Reads from Supabase + Firestore Fallback/Merge)
export async function getFinalGrades(): Promise<GradeItem[]> {
  const gradesMap = new Map<string, GradeItem>();

  // 1. Always Try Supabase First (Primary)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("final_grades").select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        data.forEach((d) => {
          const item: GradeItem = {
            id: d.id,
            assignmentId: d.assignment_id || d.exam_id,
            examId: d.exam_id || d.assignment_id,
            nisn: d.nisn,
            studentName: d.student_name,
            kelas: d.kelas,
            nilai: d.nilai ?? d.score,
            score: d.score ?? d.nilai,
            submittedAt: d.submitted_at,
            violationCount: d.violation_count || 0,
            answers: d.answers || {},
            isRemedial: d.is_remedial,
            remedialScore: d.remedial_score,
          };
          const key = item.id || `${item.assignmentId}_${item.nisn}`;
          gradesMap.set(key, item);
        });
      }
    } catch (err) {
      console.warn("Supabase fetch grades exception:", err);
    }
  }

  // 2. Also check Firestore for any fresh or existing grades
  if (!isFirebaseDisabled) {
    try {
      const snap = await getDocs(collection(db, "final_grades"));
      snap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        const asgId = d.assignmentId || d.examId || "";
        const nisnVal = d.nisn || "";
        const item: GradeItem = {
          id: docSnap.id,
          assignmentId: asgId,
          examId: d.examId || asgId,
          nisn: nisnVal,
          studentName: d.studentName,
          kelas: d.kelas,
          nilai: d.nilai ?? d.score,
          score: d.score ?? d.nilai,
          ...d,
        };
        const key = docSnap.id || `${asgId}_${nisnVal}`;
        if (!gradesMap.has(key)) {
          gradesMap.set(key, item);
        } else {
          const existing = gradesMap.get(key)!;
          // Prefer non-null values if existing has null/0
          if ((existing.nilai === null || existing.nilai === undefined) && (item.nilai !== null && item.nilai !== undefined)) {
            gradesMap.set(key, { ...existing, ...item });
          }
        }
      });
    } catch (err: any) {
      if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
        isFirebaseDisabled = true;
      }
    }
  }

  return Array.from(gradesMap.values());
}

// 2. Fetch Exams (Unlimited Reads from Supabase)
export async function getExams(): Promise<ExamItem[]> {
  // 1. Always Try Supabase First (Primary)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("exams").select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          title: d.title,
          subject: d.subject,
          kelasRef: d.kelas_ref,
          token: d.token,
          duration: d.duration,
          kkm: d.kkm,
          questions: d.questions || [],
          createdAt: d.created_at,
        }));
      }
    } catch (err) {
      console.warn("Supabase fetch exams exception:", err);
    }
  }

  // 2. Fallback to Firestore
  if (isFirebaseDisabled) return [];

  try {
    const snap = await getDocs(collection(db, "exams"));
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ExamItem[];
  } catch (err: any) {
    if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
      isFirebaseDisabled = true;
    }
    return [];
  }
}

// 3. Save a Final Grade (Saves to Supabase as primary, Firestore as background backup)
export async function saveFinalGrade(grade: GradeItem): Promise<boolean> {
  const gradeId = grade.id || `${grade.assignmentId || grade.examId}_${grade.nisn}`;

  let supabaseSuccess = false;

  // 1. Save to Supabase (Primary)
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("final_grades").upsert({
        id: gradeId,
        exam_id: grade.examId || grade.assignmentId,
        assignment_id: grade.assignmentId || grade.examId,
        nisn: grade.nisn,
        student_name: grade.studentName || "",
        kelas: grade.kelas || "",
        nilai: grade.nilai ?? grade.score ?? 0,
        score: grade.score ?? grade.nilai ?? 0,
        submitted_at: new Date().toISOString(),
        violation_count: grade.violationCount || 0,
        answers: grade.answers || {},
        is_remedial: grade.isRemedial || false,
        remedial_score: grade.remedialScore || null,
      });
      
      if (!error) {
        supabaseSuccess = true;
      }
    } catch (err) {
      console.warn("Supabase save grade error:", err);
    }
  }

  // 2. Save to Firestore (Background Backup)
  if (isFirebaseDisabled) return supabaseSuccess;

  try {
    const finalRef = doc(db, "final_grades", gradeId);
    await setDoc(finalRef, grade, { merge: true });
    return true; // Return true as long as one of them or Firebase worked
  } catch (err: any) {
    if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
      isFirebaseDisabled = true;
    }
    // If Firebase quota is reached but Supabase worked, we are still good
    return supabaseSuccess;
  }
}

// 4. Real-time Subscription (Zero Quota - WebSocket Stream)
export function subscribeToFinalGrades(
  onGradeChange: (grade: GradeItem) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel("realtime_final_grades")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "final_grades" },
        (payload: any) => {
          const d = payload.new;
          if (d && d.id) {
            const formatted: GradeItem = {
              id: d.id,
              assignmentId: d.assignment_id || d.exam_id,
              examId: d.exam_id || d.assignment_id,
              nisn: d.nisn,
              studentName: d.student_name,
              kelas: d.kelas,
              nilai: d.nilai ?? d.score,
              score: d.score ?? d.nilai,
              submittedAt: d.submitted_at,
              violationCount: d.violation_count || 0,
              answers: d.answers || {},
              isRemedial: d.is_remedial,
              remedialScore: d.remedial_score,
            };
            onGradeChange(formatted);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn("Supabase realtime subscription exception:", err);
    return () => {};
  }
}

// Helper to extract collection name from Query/CollectionRef
function getCollectionName(queryOrCollection: any): string {
  if (!queryOrCollection) return "";
  if (typeof queryOrCollection.path === "string" && queryOrCollection.path.length > 0) {
    return queryOrCollection.path;
  }
  if (queryOrCollection._query && queryOrCollection._query.path) {
    const segments = queryOrCollection._query.path.segments;
    if (Array.isArray(segments) && segments.length > 0) return segments.join("/");
  }
  if (typeof queryOrCollection.id === "string" && queryOrCollection.id.length > 0) {
    return queryOrCollection.id;
  }
  return "";
}

// Helper to filter items client-side using Firebase Query filters
function applyQueryFilters(collectionName: string, items: any[], queryOrCollection: any): any[] {
  const _query = queryOrCollection?._query;
  if (!_query || !Array.isArray(_query.filters) || _query.filters.length === 0) {
    return items;
  }
  try {
    let filtered = [...items];
    for (const filter of _query.filters) {
      const fieldSegments = filter.field?.segments;
      const fieldName = Array.isArray(fieldSegments) ? fieldSegments[0] : (typeof filter.field === "string" ? filter.field : null);
      const op = filter.op;
      
      let filterVal = filter.value?.stringValue ?? filter.value?.integerValue ?? filter.value?.booleanValue ?? filter.value;
      if (filter.value && typeof filter.value === "object" && !filter.value.stringValue && !filter.value.integerValue && !filter.value.booleanValue) {
        const keys = Object.keys(filter.value);
        if (keys.length === 1 && keys[0].endsWith("Value")) {
          filterVal = filter.value[keys[0]];
        }
      }
      
      if (fieldName && op && filterVal !== undefined) {
        filtered = filtered.filter(item => {
          const itemVal = item[fieldName];
          const sItemVal = itemVal === null || itemVal === undefined ? "" : String(itemVal).toLowerCase().trim();
          const sFilterVal = String(filterVal).toLowerCase().trim();
          
          if (op === "==" || op === "EQUAL") {
            return sItemVal === sFilterVal;
          }
          if (op === "!=" || op === "NOT_EQUAL") {
            return sItemVal !== sFilterVal;
          }
          if (op === ">=" || op === "GREATER_THAN_OR_EQUAL") {
            return Number(itemVal) >= Number(filterVal);
          }
          if (op === "<=" || op === "LESS_THAN_OR_EQUAL") {
            return Number(itemVal) <= Number(filterVal);
          }
          if (op === ">" || op === "GREATER_THAN") {
            return Number(itemVal) > Number(filterVal);
          }
          if (op === "<" || op === "LESS_THAN") {
            return Number(itemVal) < Number(filterVal);
          }
          return true;
        });
      }
    }
    return filtered;
  } catch (err) {
    console.warn("Failed parsing query filters, returning all items:", err);
  }
  return items;
}

function wrapSnapshot(docs: any[]) {
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: any) => docs.forEach(callback),
    map: (callback: any) => docs.map(callback),
    filter: (callback: any) => docs.filter(callback),
  };
}

// Transparent read wrapper: getDocs replacement
export async function dbGetDocs(queryOrCollectionRef: any): Promise<any> {
  const collectionName = getCollectionName(queryOrCollectionRef);

  // 1. Try Supabase first (Primary Source)
  if (isSupabaseConfigured && supabase && collectionName) {
    try {
      if (collectionName === "final_grades") {
        const { data, error } = await supabase.from("final_grades").select("*").limit(5000);
        if (!error && Array.isArray(data)) {
          const formatted = data.map((d) => ({
            id: d.id,
            assignmentId: d.assignment_id || d.exam_id,
            examId: d.exam_id || d.assignment_id,
            nisn: d.nisn,
            studentName: d.student_name,
            kelas: d.kelas,
            nilai: d.nilai ?? d.score,
            score: d.score ?? d.nilai,
            submittedAt: d.submitted_at,
            violationCount: d.violation_count || 0,
            answers: d.answers || {},
            isRemedial: d.is_remedial,
            remedialScore: d.remedial_score,
          }));
          const filtered = applyQueryFilters(collectionName, formatted, queryOrCollectionRef);
          const docs = filtered.map(item => ({
            id: item.id,
            exists: () => true,
            data: () => item
          }));
          // If we found data in Supabase, return it and skip Firestore
          if (docs.length > 0) return wrapSnapshot(docs);
        }
      } else if (collectionName === "exams") {
        const { data, error } = await supabase.from("exams").select("*").limit(1000);
        if (!error && Array.isArray(data)) {
          const formatted = data.map((d) => ({
            id: d.id,
            title: d.title,
            subject: d.subject,
            kelasRef: d.kelas_ref,
            token: d.token,
            duration: d.duration,
            kkm: d.kkm,
            questions: d.questions || [],
            createdAt: d.created_at,
          }));
          const filtered = applyQueryFilters(collectionName, formatted, queryOrCollectionRef);
          const docs = filtered.map(item => ({
            id: item.id,
            exists: () => true,
            data: () => item
          }));
          if (docs.length > 0) return wrapSnapshot(docs);
        }
      } else {
        // Generic app_collections table
        const { data, error } = await supabase
          .from("app_collections")
          .select("doc_id, data")
          .eq("collection_name", collectionName)
          .limit(5000);

        if (!error && Array.isArray(data) && data.length > 0) {
          const formatted = data.map((item: any) => ({
            id: item.doc_id,
            ...item.data
          }));
          const filtered = applyQueryFilters(collectionName, formatted, queryOrCollectionRef);
          const docs = filtered.map(item => ({
            id: item.id,
            exists: () => true,
            data: () => item
          }));
          return wrapSnapshot(docs);
        }
      }
    } catch (err: any) {
      console.warn(`Supabase getDocs read bypass for ${collectionName}:`, err?.message || err);
    }
  }

  // 2. Fallback to Firestore (Secondary Source) or Offline Persistent Cache
  try {
    let snap: any = null;
    if (!isFirebaseDisabled) {
      try {
        snap = await getDocs(queryOrCollectionRef);
      } catch (networkErr: any) {
        if (networkErr?.message?.includes("Quota") || networkErr?.code === "resource-exhausted" || networkErr?.code === "unavailable") {
          isFirebaseDisabled = true;
        }
      }
    }

    // Try reading from Firestore local persistent cache (IndexedDB)
    if (!snap || snap.empty) {
      try {
        const cacheSnap = await getDocsFromCache(queryOrCollectionRef);
        if (cacheSnap && !cacheSnap.empty) {
          snap = cacheSnap;
        }
      } catch (_) {
        // cache read error is ignored
      }
    }
    
    // Auto-populate Supabase cache in the background if we got data
    if (isSupabaseConfigured && supabase && snap && !snap.empty && collectionName) {
      setTimeout(async () => {
        try {
          if (collectionName !== "final_grades" && collectionName !== "exams" && snap.docs) {
            const formatted = snap.docs.map((docSnap: any) => ({
              id: `${collectionName}_${docSnap.id}`,
              collection_name: collectionName,
              doc_id: docSnap.id,
              data: docSnap.data(),
              updated_at: new Date().toISOString()
            }));
            await supabase.from("app_collections").upsert(formatted, { onConflict: "id" });
          }
        } catch (err) {
          // background sync fail is ok
        }
      }, 50);
    }

    if (snap && typeof snap.forEach === "function" && snap.docs && snap.docs.length > 0) {
      return snap;
    }

    const snapDocs = snap && Array.isArray(snap.docs) ? snap.docs : [];
    if (snapDocs.length > 0) {
      return wrapSnapshot(snapDocs);
    }
  } catch (err: any) {
    if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
      isFirebaseDisabled = true;
    }
  }

  // 3. Fallback to localStorage backup if available
  if (collectionName) {
    try {
      const localKey = collectionName === "studentsByNisn" ? "firas_cache_students" : `firas_cache_${collectionName}`;
      const rawCached = localStorage.getItem(localKey);
      if (rawCached) {
        const parsed = JSON.parse(rawCached);
        let items: any[] = [];
        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.data)) {
          items = parsed.data;
        }

        if (items.length > 0) {
          const filtered = applyQueryFilters(collectionName, items, queryOrCollectionRef);
          const docs = filtered.map((item: any) => ({
            id: item.id || item.nisn || item.docId,
            exists: () => true,
            data: () => item,
          }));
          return wrapSnapshot(docs);
        }
      }
    } catch (_) {}
  }

  return wrapSnapshot([]);
}

// Transparent read wrapper: getDoc replacement
export async function dbGetDoc(docRef: any): Promise<any> {
  const pathSegments = docRef.path?.split("/");
  if (!pathSegments || pathSegments.length < 2) {
    return { exists: () => false, data: () => null };
  }
  const collectionName = pathSegments[0];
  const docId = pathSegments[1];

  // 1. Try Supabase first (Primary Source)
  if (isSupabaseConfigured && supabase) {
    try {
      const id = `${collectionName}_${docId}`;
      const { data, error } = await supabase
        .from("app_collections")
        .select("data")
        .eq("id", id)
        .maybeSingle();

      if (!error && data && data.data) {
        return {
          id: docId,
          exists: () => true,
          data: () => data.data
        };
      }
    } catch (err: any) {
      console.warn(`Supabase getDoc read bypass for ${collectionName}/${docId}:`, err?.message || err);
    }
  }

  // 2. Fallback to Firestore (Secondary Source) or Offline Persistent Cache
  try {
    let snap: any = null;
    if (!isFirebaseDisabled) {
      try {
        snap = await getDoc(docRef);
      } catch (err: any) {
        if (err?.message?.includes("Quota") || err?.code === "resource-exhausted" || err?.code === "unavailable") {
          isFirebaseDisabled = true;
        }
      }
    }

    if (!snap || !snap.exists()) {
      try {
        const cacheSnap = await getDocFromCache(docRef);
        if (cacheSnap && cacheSnap.exists()) {
          snap = cacheSnap;
        }
      } catch (_) {}
    }

    if (snap && snap.exists()) {
      if (isSupabaseConfigured && supabase) {
        setTimeout(async () => {
          try {
            const id = `${collectionName}_${docId}`;
            await supabase.from("app_collections").upsert({
              id,
              collection_name: collectionName,
              doc_id: docId,
              data: snap.data(),
              updated_at: new Date().toISOString()
            });
          } catch (err) {}
        }, 50);
      }
      return snap;
    }
  } catch (err: any) {
    if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
      isFirebaseDisabled = true;
    }
  }

  return { exists: () => false, data: () => null };
}

// Transparent write wrapper: setDoc replacement
export async function dbSetDoc(docRef: any, data: any, options?: any): Promise<void> {
  const pathSegments = docRef.path?.split("/");
  if (!pathSegments || pathSegments.length < 2) {
    await setDoc(docRef, data, options);
    return;
  }
  const collectionName = pathSegments[0];
  const docId = pathSegments[1];

  // 1. Write to Supabase first
  if (isSupabaseConfigured && supabase) {
    try {
      if (collectionName === "final_grades") {
        await supabase.from("final_grades").upsert({
          id: docId,
          exam_id: data.examId || data.assignmentId,
          assignment_id: data.assignmentId || data.examId,
          nisn: data.nisn,
          student_name: data.studentName || "",
          kelas: data.kelas || "",
          nilai: data.nilai ?? data.score ?? 0,
          score: data.score ?? data.nilai ?? 0,
          submitted_at: data.submittedAt || data.gradedAt || new Date().toISOString(),
          violation_count: data.violationCount || 0,
          answers: data.answers || {},
          is_remedial: data.isRemedial || false,
          remedial_score: data.remedialScore || null,
        });
      } else if (collectionName === "exams") {
        await supabase.from("exams").upsert({
          id: docId,
          title: data.title,
          subject: data.subject,
          kelas_ref: data.kelasRef,
          token: data.token,
          duration: data.duration,
          kkm: data.kkm,
          questions: data.questions || [],
          created_at: data.createdAt || new Date().toISOString()
        });
      } else {
        const id = `${collectionName}_${docId}`;
        let dataToSave = data;

        // If merge option is specified, merge with existing data in Supabase
        if (options && (options.merge === true || options.mergeFields)) {
          try {
            const { data: existingRow } = await supabase
              .from("app_collections")
              .select("data")
              .eq("id", id)
              .maybeSingle();

            if (existingRow && existingRow.data && typeof existingRow.data === "object") {
              dataToSave = { ...existingRow.data, ...data };
            }
          } catch (mErr) {
            console.warn("Supabase merge fetch warning:", mErr);
          }
        }

        // Safety check for studentsByNisn: do not create phantom/empty records
        if (collectionName === "studentsByNisn") {
          const hasName = Boolean(dataToSave?.displayName || dataToSave?.studentName || dataToSave?.name);
          const hasClass = Boolean(dataToSave?.kelas);
          if (!hasName || !hasClass) {
            // Check if there is an existing student record to merge into
            const { data: existingStudent } = await supabase
              .from("app_collections")
              .select("data")
              .eq("id", id)
              .maybeSingle();

            if (existingStudent?.data?.displayName) {
              dataToSave = { ...existingStudent.data, ...dataToSave };
            } else {
              // Do not write an empty student without name and class to studentsByNisn
              console.warn(`Prevented creating empty student record in studentsByNisn/${docId}`);
              return;
            }
          }
        }

        await supabase.from("app_collections").upsert({
          id,
          collection_name: collectionName,
          doc_id: docId,
          data: dataToSave,
          updated_at: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.warn(`Supabase write sync warning for ${collectionName}/${docId}:`, err?.message || err);
    }
  }

  // 2. Fallback to Firestore (ignore quota exhaustion, treat as success if saved to Supabase)
  try {
    await setDoc(docRef, data, options);
  } catch (err: any) {
    if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
      console.warn(`Firestore write quota reached for ${collectionName}. Successfully synced to Supabase!`);
    } else {
      throw err;
    }
  }
}

// Transparent delete wrapper: deleteDoc replacement
export async function dbDeleteDoc(docRef: any, collectionNameParam?: string, docIdParam?: string, extraParam?: string): Promise<void> {
  const pathSegments = docRef?.path?.split("/");
  const collectionName = collectionNameParam || (pathSegments && pathSegments.length >= 2 ? pathSegments[0] : "");
  const docId = docIdParam || (pathSegments && pathSegments.length >= 2 ? pathSegments[1] : "");

  if (!collectionName || !docId) {
    try {
      await deleteDoc(docRef);
    } catch (_) {}
    return;
  }

  // 1. Delete from Supabase first (Primary Source)
  if (isSupabaseConfigured && supabase) {
    try {
      if (collectionName === "final_grades") {
        await supabase.from("final_grades").delete().eq("id", docId);
        await supabase.from("final_grades").delete().eq("exam_id", docId);
      } else if (collectionName === "exams") {
        await supabase.from("exams").delete().eq("id", docId);
        await supabase.from("app_collections").delete().eq("id", `exams_${docId}`);
        await supabase.from("app_collections").delete().eq("collection_name", "exams").eq("doc_id", docId);
      } else if (collectionName === "classes") {
        const id = `classes_${docId}`;
        await supabase.from("app_collections").delete().eq("id", id);
        await supabase.from("app_collections").delete().eq("collection_name", "classes").eq("doc_id", docId);
        await supabase.from("app_collections").delete().eq("collection_name", "classes").filter("data->>name", "eq", docId);
        if (extraParam && extraParam !== docId) {
          await supabase.from("app_collections").delete().eq("id", `classes_${extraParam}`);
          await supabase.from("app_collections").delete().eq("collection_name", "classes").eq("doc_id", extraParam);
          await supabase.from("app_collections").delete().eq("collection_name", "classes").filter("data->>name", "eq", extraParam);
        }
      } else {
        const id = `${collectionName}_${docId}`;
        await supabase.from("app_collections").delete().eq("id", id);
        await supabase.from("app_collections").delete().eq("collection_name", collectionName).eq("doc_id", docId);
      }
    } catch (err: any) {
      console.warn(`Supabase delete sync warning for ${collectionName}/${docId}:`, err?.message || err);
    }
  }

  // 2. Fallback to Firestore (ignore quota exhaustion, treat as success if deleted from Supabase)
  try {
    await deleteDoc(docRef);
  } catch (err: any) {
    if (
      err?.message?.includes("Quota") ||
      err?.code === "resource-exhausted" ||
      err?.code === "unavailable"
    ) {
      console.warn(`Firestore delete quota reached for ${collectionName}/${docId}. Successfully deleted from Supabase!`);
    } else {
      if (!isSupabaseConfigured) {
        throw err;
      }
    }
  }
}

// 5. One-Click Migration: Sync all existing Firebase data into Supabase
export async function syncAllFirebaseToSupabase(): Promise<{
  gradesCount: number;
  examsCount: number;
  otherCount?: number;
  error?: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { gradesCount: 0, examsCount: 0, error: "Supabase belum terkonfigurasi" };
  }

  try {
    let gradesCount = 0;
    let examsCount = 0;
    let otherCount = 0;
    const studentMap = new Map<string, { displayName: string; kelas: string }>();

    // 1. Sync Students and Classes first to build metadata mapping
    const metaCollections = ["studentsByNisn", "classes", "assignments", "submissions", "chapters", "announcements", "absensi", "materials"];
    for (const coll of metaCollections) {
      try {
        let snap: any = null;
        try {
          snap = await getDocs(collection(db, coll));
        } catch (networkErr: any) {
          // If Firestore quota exhausted or network error, fallback to client IndexedDB cache
          try {
            snap = await getDocsFromCache(collection(db, coll));
          } catch (_) {}
        }

        if (snap && !snap.empty) {
          const formatted = snap.docs
            .filter((docSnap: any) => {
              if (coll === "studentsByNisn") {
                const d = docSnap.data();
                return Boolean(d?.displayName || d?.studentName || d?.name);
              }
              return true;
            })
            .map((docSnap: any) => {
            const data = docSnap.data();
            if (coll === "studentsByNisn") {
              const nisn = data.nisn || docSnap.id;
              const displayName = data.displayName || data.studentName || data.name || "";
              const kelas = data.kelas || "";
              if (nisn && displayName) {
                studentMap.set(String(nisn).trim(), { displayName, kelas });
              }
            }
            return {
              id: `${coll}_${docSnap.id}`,
              collection_name: coll,
              doc_id: docSnap.id,
              data,
              updated_at: new Date().toISOString()
            };
          });

          const { error: upsertErr } = await supabase
            .from("app_collections")
            .upsert(formatted, { onConflict: "id" });
          if (!upsertErr) {
            otherCount += formatted.length;
          }
        }
      } catch (err) {
        console.warn(`Sync other collection ${coll} error:`, err);
      }
    }

    // Also populate studentMap from Supabase app_collections if already stored
    if (studentMap.size === 0) {
      try {
        const { data: supaStudents } = await supabase
          .from("app_collections")
          .select("doc_id, data")
          .eq("collection_name", "studentsByNisn")
          .limit(2000);
        if (Array.isArray(supaStudents)) {
          for (const s of supaStudents) {
            const nisn = s.data?.nisn || s.doc_id;
            const displayName = s.data?.displayName || s.data?.studentName || s.data?.name || "";
            const kelas = s.data?.kelas || "";
            if (nisn) {
              studentMap.set(String(nisn).trim(), { displayName, kelas });
            }
          }
        }
      } catch (_) {}
    }

    // 2. Sync Final Grades from Firestore with student & class enrichment
    try {
      let gradesSnap: any = null;
      try {
        gradesSnap = await getDocs(collection(db, "final_grades"));
      } catch (quotaErr: any) {
        try {
          gradesSnap = await getDocsFromCache(collection(db, "final_grades"));
        } catch (_) {}
      }

      if (gradesSnap && !gradesSnap.empty) {
        const formattedGrades = gradesSnap.docs.map((docSnap: any) => {
          const d = docSnap.data();
          const nisnKey = String(d.nisn || "").trim();
          const studentInfo = studentMap.get(nisnKey);

          return {
            id: docSnap.id,
            exam_id: d.assignmentId || d.examId || "",
            assignment_id: d.assignmentId || d.examId || "",
            nisn: d.nisn || "",
            student_name: d.studentName || studentInfo?.displayName || "",
            kelas: d.kelas || studentInfo?.kelas || "",
            nilai: d.nilai ?? d.score ?? 0,
            score: d.score ?? d.nilai ?? 0,
            submitted_at: d.submittedAt || new Date().toISOString(),
            violation_count: d.violationCount || 0,
            answers: d.answers || {},
            is_remedial: d.isRemedial || false,
            remedial_score: d.remedialScore || null,
          };
        });

        const { error: gradeErr } = await supabase
          .from("final_grades")
          .upsert(formattedGrades, { onConflict: "id" });

        if (!gradeErr) {
          gradesCount = formattedGrades.length;
        }
      }
    } catch (quotaErr: any) {
      console.warn("Grades sync note:", quotaErr);
    }

    // Enrich existing Supabase final_grades if missing student_name or kelas
    if (studentMap.size > 0) {
      try {
        const { data: existingGrades } = await supabase
          .from("final_grades")
          .select("id, nisn, student_name, kelas")
          .or("student_name.is.null,student_name.eq.,kelas.is.null,kelas.eq.")
          .limit(2000);

        if (Array.isArray(existingGrades) && existingGrades.length > 0) {
          const updates = existingGrades
            .filter((g) => {
              const info = studentMap.get(String(g.nisn || "").trim());
              return info && (!g.student_name || !g.kelas);
            })
            .map((g) => {
              const info = studentMap.get(String(g.nisn || "").trim())!;
              return {
                id: g.id,
                student_name: g.student_name || info.displayName,
                kelas: g.kelas || info.kelas,
              };
            });

          if (updates.length > 0) {
            await supabase.from("final_grades").upsert(updates, { onConflict: "id" });
          }
        }
      } catch (enrichErr) {
        console.warn("Enrich existing grades note:", enrichErr);
      }
    }

    // 3. Sync Exams
    try {
      let examsSnap: any = null;
      try {
        examsSnap = await getDocs(collection(db, "exams"));
      } catch (quotaErr: any) {
        try {
          examsSnap = await getDocsFromCache(collection(db, "exams"));
        } catch (_) {}
      }

      if (examsSnap && !examsSnap.empty) {
        const formattedExams = examsSnap.docs.map((docSnap: any) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            title: d.title || "Ujian",
            subject: d.subject || "Informatika",
            kelas_ref: d.kelasRef || "",
            token: d.token || "TOKEN",
            duration: d.duration || 3600,
            kkm: d.kkm || 75,
            questions: d.questions || [],
          };
        });

        const { error: examErr } = await supabase
          .from("exams")
          .upsert(formattedExams, { onConflict: "id" });

        if (!examErr) {
          examsCount = formattedExams.length;
        }
      }
    } catch (quotaErr: any) {
      console.warn("Exams sync note:", quotaErr);
    }

    // 4. Sync Rubric
    try {
      let rubricSnap: any = null;
      try {
        rubricSnap = await getDoc(doc(db, "config", "grading_rubric"));
      } catch (_) {
        try {
          rubricSnap = await getDocFromCache(doc(db, "config", "grading_rubric"));
        } catch (_) {}
      }

      if (rubricSnap && rubricSnap.exists && rubricSnap.exists()) {
        await supabase.from("app_collections").upsert({
          id: "config_grading_rubric",
          collection_name: "config",
          doc_id: "grading_rubric",
          data: rubricSnap.data(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn("Sync grading rubric error:", err);
    }

    // 5. Invalidate client caches so UI immediately renders fresh data from Supabase
    clearTeacherCaches();

    return { gradesCount, examsCount, otherCount };
  } catch (err: any) {
    console.error("Migration error:", err);
    return { gradesCount: 0, examsCount: 0, error: err.message || "Gagal migrasi" };
  }
}
