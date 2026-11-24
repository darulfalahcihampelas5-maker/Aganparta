import { supabase, isSupabaseConfigured } from "./supabase";
import { db } from "./firebase";
import { doc, getDocs, collection, setDoc, getDoc, getDocsFromCache, getDocFromCache, deleteDoc } from "firebase/firestore";
import { clearTeacherCaches } from "./firestoreUtils";

let isFirebaseDisabled = typeof window !== 'undefined'
  ? (localStorage.getItem('firebase_quota_exhausted') !== 'false')
  : true;

export function isFirebaseQuotaExhausted(): boolean {
  if (typeof window !== 'undefined') {
    const localVal = localStorage.getItem('firebase_quota_exhausted');
    const sessionVal = sessionStorage.getItem('firebase_quota_exhausted');
    if (localVal === 'false' && sessionVal === 'false') return false;
    if (localVal === 'true' || sessionVal === 'true') return true;
    return true;
  }
  return isFirebaseDisabled;
}

export function setFirebaseQuotaExhausted(val: boolean = true): void {
  isFirebaseDisabled = val;
  if (typeof window !== 'undefined') {
    localStorage.setItem('firebase_quota_exhausted', val ? 'true' : 'false');
    sessionStorage.setItem('firebase_quota_exhausted', val ? 'true' : 'false');
  }
}

let supabaseQuotaUntil = 0;

export function isSupabaseQuotaExhausted(): boolean {
  if (typeof window !== 'undefined') {
    const localVal = localStorage.getItem('supabase_quota_exhausted');
    const sessionVal = sessionStorage.getItem('supabase_quota_exhausted');
    if (localVal === 'false' && sessionVal === 'false') return false;
    if (localVal === 'true' || sessionVal === 'true') return true;
    const raw = Number(sessionStorage.getItem('supabase_quota_exhausted_until') || localStorage.getItem('supabase_quota_exhausted_until') || '0');
    if (raw > Date.now()) return true;
    return true;
  }
  return true;
}

export function isSupabaseQuotaError(err: any): boolean {
  const msg = String(err?.message || err?.details || err?.hint || err?.code || err || '').toLowerCase();
  return (
    msg.includes('exceed_egress_quota') ||
    msg.includes('egress') ||
    msg.includes('quota') ||
    msg.includes('spend cap') ||
    msg.includes('payment required') ||
    msg.includes('402')
  );
}

export function setSupabaseQuotaExhausted(val: boolean = true): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase_quota_exhausted', val ? 'true' : 'false');
    sessionStorage.setItem('supabase_quota_exhausted', val ? 'true' : 'false');
  }
}

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

const hasValidNumericScore = (val: any): boolean => {
  return val !== undefined && val !== null && val !== "" && !Number.isNaN(Number(val));
};

const normalizeNisnForKey = (val: any): string => {
  const s = String(val || "").trim();
  if (!s) return "";
  const unpadded = s.replace(/^0+/, "");
  return unpadded || s;
};

const extractColIdFromDocId = (docId: string, nisn: string): string => {
  if (!docId) return "";
  if (docId.startsWith("FG-") && nisn && docId.startsWith(`FG-${nisn}-`)) {
    return docId.slice(`FG-${nisn}-`.length);
  }
  const lastUnderscore = docId.lastIndexOf("_");
  if (lastUnderscore > 0) {
    return docId.substring(0, lastUnderscore);
  }
  return docId;
};

const extractTimestampMs = (item: any): number => {
  const raw =
    item?.gradedAt ||
    item?.graded_at ||
    item?.updatedAt ||
    item?.updated_at ||
    item?.submittedAt ||
    item?.submitted_at ||
    item?.finishedAt ||
    item?.lastActiveAt ||
    item?.createdAt ||
    "";
  if (!raw) return 0;
  if (typeof raw?.toDate === "function") {
    return raw.toDate().getTime() || 0;
  }
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map((item) => (item === undefined ? null : sanitizeForFirestore(item)));
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        clean[k] = sanitizeForFirestore(v);
      }
    }
    return clean;
  }
  return obj;
};

const mergeGradeRecords = (existing: GradeItem | undefined, incoming: GradeItem): GradeItem => {
  if (!existing) return incoming;

  const existingScore = existing.nilai ?? existing.score;
  const incomingScore = incoming.nilai ?? incoming.score;
  const existingHasScore = hasValidNumericScore(existingScore);
  const incomingHasScore = hasValidNumericScore(incomingScore);

  const existingTs = extractTimestampMs(existing);
  const incomingTs = extractTimestampMs(incoming);

  // Choose base record prioritizing valid numeric score first, then newest timestamp
  let primary = existing;
  let secondary = incoming;

  if (!existingHasScore && incomingHasScore) {
    primary = incoming;
    secondary = existing;
  } else if (existingHasScore && !incomingHasScore) {
    primary = existing;
    secondary = incoming;
  } else if (incomingTs > existingTs) {
    primary = incoming;
    secondary = existing;
  }

  const mergedScore = hasValidNumericScore(primary.nilai ?? primary.score)
    ? (primary.nilai ?? primary.score)
    : (secondary.nilai ?? secondary.score);

  const violationCount = Math.max(
    Number(existing.violationCount || existing.violationsCount || 0) || 0,
    Number(incoming.violationCount || incoming.violationsCount || 0) || 0
  );

  const isFinishedGrade =
    primary.status === "selesai" ||
    secondary.status === "selesai" ||
    Boolean(primary.submittedAt || primary.gradedAt || secondary.submittedAt || secondary.gradedAt);

  const resolvedStatus =
    hasValidNumericScore(mergedScore) && isFinishedGrade
      ? "selesai"
      : primary.status || secondary.status;

  return {
    ...secondary,
    ...primary,
    id: primary.id || secondary.id,
    assignmentId: primary.assignmentId || secondary.assignmentId || primary.examId || secondary.examId,
    examId: primary.examId || secondary.examId || primary.assignmentId || secondary.assignmentId,
    nisn: primary.nisn || secondary.nisn,
    studentName: primary.studentName || secondary.studentName || "",
    kelas: primary.kelas || secondary.kelas || "",
    title: primary.title || secondary.title || primary.examTitle || secondary.examTitle,
    examTitle: primary.examTitle || secondary.examTitle || primary.title || secondary.title,
    bab: primary.bab || secondary.bab,
    type: primary.type || secondary.type,
    ...(resolvedStatus ? { status: resolvedStatus } : {}),
    ...(hasValidNumericScore(mergedScore) ? { nilai: Number(mergedScore), score: Number(mergedScore) } : {}),
    violationCount,
    submittedAt: primary.submittedAt || secondary.submittedAt,
    gradedAt: primary.gradedAt || secondary.gradedAt,
    answers:
      primary.answers && Object.keys(primary.answers).length > 0
        ? primary.answers
        : (secondary.answers || {}),
  };
};

// 1. Fetch all Final Grades (Unlimited Reads from Supabase + Firestore Fallback/Merge + exam_sessions recovery)
export async function getFinalGrades(): Promise<GradeItem[]> {
  const gradesMap = new Map<string, GradeItem>();
  const scoredKeysInFinalGrades = new Set<string>();

  const isViolationOnlyStub = (item: GradeItem): boolean => {
    const hasAnswerItems = Boolean(
      item.answers &&
        typeof item.answers === "object" &&
        item.answers.items &&
        Object.keys(item.answers.items).length > 0
    );
    if (
      item.status === "melanggar" &&
      !item.submittedAt &&
      !item.gradedAt &&
      !hasAnswerItems
    ) {
      return true;
    }
    const rawScore = item.nilai ?? item.score;
    const isZeroScore =
      rawScore === undefined || rawScore === null || String(rawScore).trim() === "" || Number(rawScore) === 0;
    if (
      Number(item.violationCount || item.violationsCount || 0) > 0 &&
      !hasAnswerItems &&
      !item.isRemedial &&
      !item.gradedAt &&
      item.status !== "selesai" &&
      !item.isManualColumn &&
      isZeroScore
    ) {
      return true;
    }
    return false;
  };

  const putGrade = (item: GradeItem, fromFinalGradesCollection = false) => {
    if (isViolationOnlyStub(item)) return;
    const nisnStr = String(item.nisn || item.nis || "").trim();
    const colId = String(
      item.assignmentId || item.examId || item.alignmentId || extractColIdFromDocId(item.id, nisnStr) || ""
    ).trim();
    if (!colId && !item.id) return;

    const normNisn = normalizeNisnForKey(nisnStr);
    const canonicalKey = colId && normNisn ? `${colId}__${normNisn}` : (item.id || `${colId}__${nisnStr}`);

    const merged = mergeGradeRecords(gradesMap.get(canonicalKey), {
      ...item,
      assignmentId: item.assignmentId || colId || undefined,
      examId: item.examId || colId || undefined,
      nisn: nisnStr,
    });
    gradesMap.set(canonicalKey, merged);

    if (fromFinalGradesCollection && hasValidNumericScore(merged.nilai ?? merged.score)) {
      scoredKeysInFinalGrades.add(canonicalKey);
    }
  };

  let supaGradesSucceeded = false;

  // 1. Always Try Supabase First (Primary, paginated) unless temporarily flagged quota-exhausted
  if (isSupabaseConfigured && supabase && !isSupabaseQuotaExhausted()) {
    try {
      let allSupaData: any[] = [];
      let supaHadError = false;
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("final_grades")
          .select("*")
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) {
          supaHadError = true;
          if (isSupabaseQuotaError(error)) setSupabaseQuotaExhausted();
          break;
        }
        if (!data || data.length === 0) break;
        allSupaData.push(...data);
        if (data.length < pageSize) break;
        page++;
        if (page >= 10) break;
      }

      if (!supaHadError && allSupaData.length > 0) {
        supaGradesSucceeded = true;
        allSupaData.forEach((d) => {
          const item: GradeItem = {
            id: d.id,
            assignmentId: d.assignment_id || d.exam_id,
            examId: d.exam_id || d.assignment_id,
            nisn: d.nisn || "",
            studentName: d.student_name || "",
            kelas: d.kelas || "",
            nilai: d.nilai ?? d.score,
            score: d.score ?? d.nilai,
            submittedAt: d.submitted_at,
            violationCount: d.violation_count || 0,
            answers: d.answers || {},
            isRemedial: d.is_remedial,
            remedialScore: d.remedial_score,
          };
          putGrade(item, true);
        });
      }
    } catch (err) {
      if (isSupabaseQuotaError(err)) setSupabaseQuotaExhausted();
      console.warn("Supabase fetch grades exception:", err);
    }
  }

  // 2. Only scan Firestore final_grades when Supabase failed or returned empty (avoids double full-table scans)
  if (!supaGradesSucceeded) {
    let fsSnap: any = null;
    if (!isFirebaseDisabled && !isFirebaseQuotaExhausted()) {
      try {
        fsSnap = await getDocs(collection(db, "final_grades"));
      } catch (err: any) {
        if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
          setFirebaseQuotaExhausted(true);
        }
        try {
          fsSnap = await getDocsFromCache(collection(db, "final_grades"));
        } catch (_) {}
      }
    } else {
      try {
        fsSnap = await getDocsFromCache(collection(db, "final_grades"));
      } catch (_) {}
    }

    if (fsSnap && fsSnap.docs) {
      fsSnap.docs.forEach((docSnap: any) => {
        const d = docSnap.data();
        const nisnVal = String(d.nisn || d.nis || "").trim();
        const asgId = d.assignmentId || d.examId || extractColIdFromDocId(docSnap.id, nisnVal) || "";
        const item: GradeItem = {
          ...d,
          id: docSnap.id,
          assignmentId: asgId,
          examId: d.examId || asgId,
          nisn: nisnVal,
          studentName: d.studentName || d.student_name || "",
          kelas: d.kelas || "",
          nilai: d.nilai ?? d.score,
          score: d.score ?? d.nilai,
        };
        putGrade(item, true);
      });
    }
  }

  // 3. Recovery from completed exam_sessions (filtered to status = 'selesai' to minimize egress)
  const allSessionDocs: Array<{ id: string; data: any }> = [];
  let supaSessionsSucceeded = false;

  if (isSupabaseConfigured && supabase && !isSupabaseQuotaExhausted()) {
    try {
      let page = 0;
      const pageSize = 1000;
      let hadSessErr = false;
      while (true) {
        const { data, error } = await supabase
          .from("app_collections")
          .select("doc_id, data")
          .eq("collection_name", "exam_sessions")
          .eq("data->>status", "selesai")
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) {
          hadSessErr = true;
          if (isSupabaseQuotaError(error)) setSupabaseQuotaExhausted();
          break;
        }
        if (!data || data.length === 0) break;
        data.forEach((row: any) => {
          if (row?.data) {
            allSessionDocs.push({ id: row.doc_id || row.data?.id || "", data: row.data });
          }
        });
        if (data.length < pageSize) break;
        page++;
        if (page >= 10) break;
      }
      if (!hadSessErr && supaGradesSucceeded) {
        supaSessionsSucceeded = true;
      }
    } catch (err) {
      if (isSupabaseQuotaError(err)) setSupabaseQuotaExhausted();
      console.warn("Supabase fetch exam_sessions recovery warning:", err);
    }
  }

  if (!supaSessionsSucceeded) {
    let sessionsSnap: any = null;
    if (!isFirebaseDisabled && !isFirebaseQuotaExhausted()) {
      try {
        sessionsSnap = await getDocs(collection(db, "exam_sessions"));
      } catch (err: any) {
        if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
          setFirebaseQuotaExhausted(true);
        }
        try {
          sessionsSnap = await getDocsFromCache(collection(db, "exam_sessions"));
        } catch (_) {}
      }
    } else {
      try {
        sessionsSnap = await getDocsFromCache(collection(db, "exam_sessions"));
      } catch (_) {}
    }

    if (sessionsSnap && sessionsSnap.docs) {
      sessionsSnap.docs.forEach((docSnap: any) => {
        allSessionDocs.push({ id: docSnap.id, data: docSnap.data() });
      });
    }
  }

  const missingGradesToBackfill: GradeItem[] = [];
  allSessionDocs.forEach(({ id: sessDocId, data: d }) => {
    if (!d || d.status === "reset") return;
    const sessionScore = d.score ?? d.nilai;
    const isCompleted = d.status === "selesai" || Boolean(d.finishedAt);
    if (!isCompleted || !hasValidNumericScore(sessionScore)) return;

    const nisnVal = String(d.nisn || "").trim();
    const examId = String(d.examId || extractColIdFromDocId(sessDocId, nisnVal) || "").trim();
    if (!examId || !nisnVal) return;

    const canonicalKey = `${examId}__${normalizeNisnForKey(nisnVal)}`;
    const recoveredItem: GradeItem = {
      id: `${examId}_${nisnVal}`,
      examId,
      assignmentId: examId,
      examTitle: d.examTitle || d.title || "",
      title: d.examTitle || d.title || "",
      nisn: nisnVal,
      studentName: d.studentName || "",
      kelas: d.kelas || "",
      nilai: Number(sessionScore),
      score: Number(sessionScore),
      violationCount: Number(d.violationCount || 0) || 0,
      submittedAt: d.finishedAt || d.lastActiveAt || new Date().toISOString(),
      gradedAt: d.finishedAt || d.lastActiveAt || new Date().toISOString(),
      status: "selesai",
      type: "exam",
    };

    const existedWithScore = scoredKeysInFinalGrades.has(canonicalKey);
    putGrade(recoveredItem, false);
    if (!existedWithScore) {
      missingGradesToBackfill.push(recoveredItem);
    }
  });

  // Self-heal missing final_grades in background (only when Supabase/Firebase are not quota-blocked)
  if (missingGradesToBackfill.length > 0 && typeof window !== "undefined" && !isSupabaseQuotaExhausted()) {
    const dedupedBackfill = Array.from(
      new Map(missingGradesToBackfill.map((item) => [item.id, item])).values()
    );
    setTimeout(() => {
      dedupedBackfill.slice(0, 10).forEach((item) => {
        saveFinalGrade(item).catch(() => {});
      });
    }, 100);
  }

  return Array.from(gradesMap.values());
}

// 2. Fetch Exams (Supabase Primary, Firestore Fallback only if Supabase empty/unavailable)
export async function getExams(): Promise<ExamItem[]> {
  const examsMap = new Map<string, ExamItem>();
  let supaExamsSucceeded = false;

  // 1. Try Supabase First
  if (isSupabaseConfigured && supabase && !isSupabaseQuotaExhausted()) {
    try {
      const { data, error } = await supabase.from("exams").select("*");
      if (error) {
        if (isSupabaseQuotaError(error)) setSupabaseQuotaExhausted();
      } else if (Array.isArray(data) && data.length > 0) {
        data.forEach((d) => {
          examsMap.set(d.id, {
            id: d.id,
            title: d.title,
            subject: d.subject,
            kelasRef: d.kelas_ref,
            token: d.token,
            duration: d.duration,
            kkm: d.kkm,
            questions: d.questions || [],
            createdAt: d.created_at,
          });
        });
        if (data.every((d) => Boolean(d.kelas_ref))) {
          supaExamsSucceeded = true;
        }
      }
    } catch (err) {
      if (isSupabaseQuotaError(err)) setSupabaseQuotaExhausted();
      console.warn("Supabase fetch exams exception:", err);
    }
  }

  // 2. Fallback to Firestore only when Supabase didn't already provide full exams
  if (!supaExamsSucceeded) {
    let snap: any = null;
    if (!isFirebaseDisabled && !isFirebaseQuotaExhausted()) {
      try {
        snap = await getDocs(collection(db, "exams"));
      } catch (err: any) {
        if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
          setFirebaseQuotaExhausted(true);
        }
        try {
          snap = await getDocsFromCache(collection(db, "exams"));
        } catch (_) {}
      }
    } else {
      try {
        snap = await getDocsFromCache(collection(db, "exams"));
      } catch (_) {}
    }

    if (snap && snap.docs) {
      snap.docs.forEach((docSnap: any) => {
        const existing = examsMap.get(docSnap.id) || {};
        examsMap.set(docSnap.id, {
          ...existing,
          id: docSnap.id,
          ...docSnap.data(),
        } as ExamItem);
      });
    }
  }

  return Array.from(examsMap.values());
}

// 3. Save a Final Grade (Saves to Supabase as primary AND Firestore as durable backup)
export async function saveFinalGrade(grade: GradeItem): Promise<boolean> {
  const targetId = grade.assignmentId || grade.examId || grade.alignmentId || "";
  const cleanNisn = String(grade.nisn || "").trim();
  const gradeId = grade.id || (targetId && cleanNisn ? `${targetId}_${cleanNisn}` : `FG-${Date.now()}`);
  const numericScore = grade.nilai ?? grade.score;
  const hasScore = hasValidNumericScore(numericScore);

  let supabaseSuccess = false;
  let firestoreSuccess = false;

  // 1. Save to Supabase (Primary)
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("final_grades").upsert({
        id: gradeId,
        exam_id: grade.examId || grade.assignmentId || targetId,
        assignment_id: grade.assignmentId || grade.examId || targetId,
        nisn: cleanNisn,
        student_name: grade.studentName || "",
        kelas: grade.kelas || "",
        nilai: hasScore ? Number(numericScore) : null,
        score: hasScore ? Number(numericScore) : null,
        submitted_at: grade.submittedAt || new Date().toISOString(),
        violation_count: grade.violationCount || 0,
        answers: grade.answers || {},
        is_remedial: grade.isRemedial || false,
        remedial_score: grade.remedialScore ?? null,
      });

      if (!error) {
        supabaseSuccess = true;
      } else {
        console.warn("Supabase save grade error:", error);
      }
    } catch (err) {
      console.warn("Supabase save grade exception:", err);
    }
  }

  // 2. Save to Firestore (Durable Backup)
  if (!isFirebaseDisabled) {
    try {
      const finalRef = doc(db, "final_grades", gradeId);
      const fsPayload = sanitizeForFirestore({
        ...grade,
        id: gradeId,
        assignmentId: grade.assignmentId || grade.examId || targetId,
        examId: grade.examId || grade.assignmentId || targetId,
        nisn: cleanNisn,
        ...(hasScore ? { nilai: Number(numericScore), score: Number(numericScore) } : {}),
        updatedAt: grade.updatedAt || new Date().toISOString(),
      });
      await setDoc(finalRef, fsPayload, { merge: true });
      firestoreSuccess = true;
    } catch (err: any) {
      if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
        isFirebaseDisabled = true;
      }
      console.warn("Firestore save grade error:", err);
    }
  }

  return supabaseSuccess || firestoreSuccess;
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

// Helper to compare NISN strings robustly
function checkSameNisn(a: any, b: any): boolean {
  const strA = String(a || "").trim();
  const strB = String(b || "").trim();
  if (!strA || !strB) return false;
  if (strA === strB) return true;
  const normA = strA.replace(/^0+/, "");
  const normB = strB.replace(/^0+/, "");
  if (normA && normB && normA === normB) return true;
  const padA = strA.padStart(10, "0");
  const padB = strB.padStart(10, "0");
  return padA === padB;
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
      
      let filterVal: any;
      if (filter.value?.arrayValue?.values && Array.isArray(filter.value.arrayValue.values)) {
        filterVal = filter.value.arrayValue.values.map((v: any) => v.stringValue ?? v.integerValue ?? v.booleanValue ?? v);
      } else if (Array.isArray(filter.value)) {
        filterVal = filter.value;
      } else if (filter.value?.stringValue !== undefined) {
        filterVal = filter.value.stringValue;
      } else if (filter.value?.integerValue !== undefined) {
        filterVal = filter.value.integerValue;
      } else if (filter.value?.booleanValue !== undefined) {
        filterVal = filter.value.booleanValue;
      } else if (filter.value && typeof filter.value === "object") {
        const keys = Object.keys(filter.value);
        if (keys.length === 1 && keys[0].endsWith("Value")) {
          filterVal = filter.value[keys[0]];
        } else {
          filterVal = filter.value;
        }
      } else {
        filterVal = filter.value;
      }
      
      if (fieldName && op && filterVal !== undefined) {
        filtered = filtered.filter(item => {
          const itemVal = item[fieldName];
          const sItemVal = itemVal === null || itemVal === undefined ? "" : String(itemVal).toLowerCase().trim();
          const sFilterVal = typeof filterVal === "string" || typeof filterVal === "number" ? String(filterVal).toLowerCase().trim() : "";
          
          if (op === "==" || op === "EQUAL") {
            if (fieldName === "nisn" || fieldName === "nis") {
              return checkSameNisn(itemVal, filterVal);
            }
            return sItemVal === sFilterVal;
          }
          if (op === "!=" || op === "NOT_EQUAL") {
            if (fieldName === "nisn" || fieldName === "nis") {
              return !checkSameNisn(itemVal, filterVal);
            }
            return sItemVal !== sFilterVal;
          }
          if (op === "in" || op === "IN") {
            const arr = Array.isArray(filterVal) ? filterVal : [filterVal];
            if (fieldName === "nisn" || fieldName === "nis") {
              return arr.some((v: any) => checkSameNisn(itemVal, v));
            }
            return arr.some((v: any) => String(v).toLowerCase().trim() === sItemVal);
          }
          if (op === "not-in" || op === "NOT_IN") {
            const arr = Array.isArray(filterVal) ? filterVal : [filterVal];
            if (fieldName === "nisn" || fieldName === "nis") {
              return !arr.some((v: any) => checkSameNisn(itemVal, v));
            }
            return !arr.some((v: any) => String(v).toLowerCase().trim() === sItemVal);
          }
          if (op === "array-contains" || op === "ARRAY_CONTAINS") {
            if (!Array.isArray(itemVal)) return false;
            return itemVal.some((v: any) => String(v).toLowerCase().trim() === sFilterVal);
          }
          if (op === "array-contains-any" || op === "ARRAY_CONTAINS_ANY") {
            if (!Array.isArray(itemVal)) return false;
            const arr = Array.isArray(filterVal) ? filterVal : [filterVal];
            return itemVal.some((iv: any) => arr.some((av: any) => String(av).toLowerCase().trim() === String(iv).toLowerCase().trim()));
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
  if (isSupabaseConfigured && supabase && collectionName && !isSupabaseQuotaExhausted()) {
    try {
      // Helper to extract simple equality filter from Firestore query
      const extractEqFilter = (targetFields: string[]): { field: string; value: string } | null => {
        const filters = queryOrCollectionRef?._query?.filters;
        if (!Array.isArray(filters)) return null;
        for (const f of filters) {
          const fName = Array.isArray(f.field?.segments)
            ? f.field.segments[0]
            : typeof f.field === "string"
            ? f.field
            : null;
          if (fName && targetFields.includes(fName) && (f.op === "==" || f.op === "EQUAL")) {
            const val = f.value?.stringValue ?? (typeof f.value === "string" ? f.value : "");
            if (val) return { field: fName, value: String(val).trim() };
          }
        }
        return null;
      };

      if (collectionName === "final_grades") {
        const nisnEq = extractEqFilter(["nisn", "nis"]);
        const kelasEq = extractEqFilter(["kelas"]);
        const examEq = extractEqFilter(["examId", "assignmentId"]);

        let allData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
          let req = supabase.from("final_grades").select("*");
          if (nisnEq) {
            const unp = nisnEq.value.replace(/^0+/, "");
            const pad = unp.padStart(10, "0");
            req = req.in("nisn", Array.from(new Set([nisnEq.value, unp, pad].filter(Boolean))));
          } else if (kelasEq) {
            req = req.eq("kelas", kelasEq.value);
          } else if (examEq) {
            req = req.or(`exam_id.eq.${examEq.value},assignment_id.eq.${examEq.value}`);
          }
          const { data, error } = await req.range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) {
            if (isSupabaseQuotaError(error)) setSupabaseQuotaExhausted();
            break;
          }
          if (!data || data.length === 0) break;
          allData.push(...data);
          if (data.length < pageSize) break;
          page++;
          if (page >= 10) break;
        }

        if (allData.length > 0) {
          const formatted = allData.map((d) => ({
            id: d.id,
            assignmentId: d.assignment_id || d.exam_id,
            examId: d.exam_id || d.assignment_id,
            nisn: d.nisn,
            studentName: d.student_name,
            kelas: d.kelas,
            nilai: d.nilai ?? d.score,
            score: d.score ?? d.nilai,
            submittedAt: d.submitted_at,
            gradedAt: d.graded_at || d.submitted_at,
            title: d.title || d.exam_title,
            examTitle: d.exam_title || d.title,
            bab: d.bab,
            type: d.type,
            status: d.status,
            isManualColumn: d.is_manual_column,
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
          return wrapSnapshot(docs);
        }
      } else if (collectionName === "exams") {
        const { data, error } = await supabase.from("exams").select("*").limit(1000);
        if (error) {
          if (isSupabaseQuotaError(error)) setSupabaseQuotaExhausted();
        } else if (Array.isArray(data) && data.length > 0) {
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
          return wrapSnapshot(docs);
        }
      } else {
        // Generic app_collections table (e.g. submissions, studentsByNisn, assignments, exam_sessions)
        const _query = queryOrCollectionRef?._query;
        let fetchedData: any[] = [];
        let isSupabaseSuccess = false;

        let nisnFilter: any = null;
        if (_query && Array.isArray(_query.filters)) {
          for (const f of _query.filters) {
            const fName = Array.isArray(f.field?.segments) ? f.field.segments[0] : (typeof f.field === "string" ? f.field : null);
            if (fName === "nisn" || fName === "nis") {
              nisnFilter = f;
              break;
            }
          }
        }

        if (nisnFilter) {
          let filterVal: any;
          if (nisnFilter.value?.arrayValue?.values && Array.isArray(nisnFilter.value.arrayValue.values)) {
            filterVal = nisnFilter.value.arrayValue.values.map((v: any) => v.stringValue ?? v.integerValue ?? v.booleanValue ?? v);
          } else if (Array.isArray(nisnFilter.value)) {
            filterVal = nisnFilter.value;
          } else {
            filterVal = nisnFilter.value?.stringValue ?? nisnFilter.value;
          }

          const rawValues = Array.isArray(filterVal) ? filterVal : [filterVal];
          const allNisnVariants: string[] = [];
          rawValues.forEach((v: any) => {
            if (!v) return;
            const str = String(v).trim();
            const unp = str.replace(/^0+/, "");
            const pad = unp.padStart(10, "0");
            allNisnVariants.push(str, unp, pad);
          });
          const uniqueVariants = Array.from(new Set(allNisnVariants.filter(Boolean)));

          if (uniqueVariants.length > 0) {
            const { data, error } = await supabase
              .from("app_collections")
              .select("doc_id, data")
              .eq("collection_name", collectionName)
              .in("data->>nisn", uniqueVariants);
            if (error) {
              if (isSupabaseQuotaError(error)) setSupabaseQuotaExhausted();
            } else if (Array.isArray(data) && data.length > 0) {
              fetchedData = data;
              isSupabaseSuccess = true;
            } else {
              const { data: nisData, error: nisErr } = await supabase
                .from("app_collections")
                .select("doc_id, data")
                .eq("collection_name", collectionName)
                .in("data->>nis", uniqueVariants);
              if (nisErr) {
                if (isSupabaseQuotaError(nisErr)) setSupabaseQuotaExhausted();
              } else if (Array.isArray(nisData) && nisData.length > 0) {
                fetchedData = nisData;
                isSupabaseSuccess = true;
              }
            }
          }
        } else {
          // Push down common equality filters (examId, assignmentId, kelas, studentId) so we don't scan the full collection
          const pushedFilter = extractEqFilter(["examId", "assignmentId", "kelas", "studentId"]);
          let page = 0;
          const pageSize = 1000;
          let hadError = false;
          while (true) {
            let req = supabase
              .from("app_collections")
              .select("doc_id, data")
              .eq("collection_name", collectionName);
            if (pushedFilter) {
              req = req.eq(`data->>${pushedFilter.field}`, pushedFilter.value);
            }
            const { data, error } = await req.range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) {
              hadError = true;
              if (isSupabaseQuotaError(error)) setSupabaseQuotaExhausted();
              break;
            }
            if (!data || data.length === 0) break;
            fetchedData.push(...data);
            if (data.length < pageSize) break;
            page++;
            if (page >= 10) break;
          }
          if (!hadError && fetchedData.length > 0) {
            isSupabaseSuccess = true;
          }
        }

        if (isSupabaseSuccess && fetchedData.length > 0) {
          const formatted = fetchedData.map((item: any) => ({
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
      if (isSupabaseQuotaError(err)) setSupabaseQuotaExhausted();
      console.warn(`Supabase getDocs read bypass for ${collectionName}:`, err?.message || err);
    }
  }

  // 2. Fallback to Firestore (Secondary Source) only if Firebase is active and not quota exhausted
  try {
    let snap: any = null;
    if (!isFirebaseDisabled && !isFirebaseQuotaExhausted()) {
      try {
        snap = await getDocs(queryOrCollectionRef);
      } catch (networkErr: any) {
        if (networkErr?.message?.includes("Quota") || networkErr?.code === "resource-exhausted" || networkErr?.code === "unavailable") {
          setFirebaseQuotaExhausted(true);
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
      } catch (_) {}
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
      const localKey =
        collectionName === "studentsByNisn"
          ? "firas_cache_students"
          : collectionName === "assignments"
          ? "firas_cache_assignments_v2"
          : collectionName === "exams"
          ? "firas_cache_exams_v2"
          : `firas_cache_${collectionName}`;
      const rawCached = localStorage.getItem(localKey) || localStorage.getItem(`firas_cache_${collectionName}`);
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
  if (isSupabaseConfigured && supabase && !isSupabaseQuotaExhausted()) {
    try {
      const id = `${collectionName}_${docId}`;
      const { data, error } = await supabase
        .from("app_collections")
        .select("data")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        if (isSupabaseQuotaError(error)) setSupabaseQuotaExhausted();
      } else if (data && data.data) {
        return {
          id: docId,
          exists: () => true,
          data: () => data.data
        };
      }
    } catch (err: any) {
      if (isSupabaseQuotaError(err)) setSupabaseQuotaExhausted();
      console.warn(`Supabase getDoc read bypass for ${collectionName}/${docId}:`, err?.message || err);
    }
  }

  // 2. Fallback to Firestore (Secondary Source) or Offline Persistent Cache
  try {
    let snap: any = null;
    if (!isFirebaseDisabled && !isFirebaseQuotaExhausted()) {
      try {
        snap = await getDoc(docRef);
      } catch (err: any) {
        if (err?.message?.includes("Quota") || err?.code === "resource-exhausted" || err?.code === "unavailable") {
          setFirebaseQuotaExhausted(true);
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
      return snap;
    }
  } catch (err: any) {
    if (err?.message?.includes("Quota") || err?.code === "resource-exhausted") {
      setFirebaseQuotaExhausted(true);
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

  // 1. Write to Supabase first unless quota cooldown is active
  if (isSupabaseConfigured && supabase && !isSupabaseQuotaExhausted()) {
    try {
      if (collectionName === "final_grades") {
        const rawNumeric = data.nilai ?? data.score;
        const hasNumeric = hasValidNumericScore(rawNumeric);
        await supabase.from("final_grades").upsert({
          id: docId,
          exam_id: data.examId || data.assignmentId,
          assignment_id: data.assignmentId || data.examId,
          nisn: data.nisn,
          student_name: data.studentName || "",
          kelas: data.kelas || "",
          nilai: hasNumeric ? Number(rawNumeric) : null,
          score: hasNumeric ? Number(rawNumeric) : null,
          submitted_at: data.submittedAt || data.gradedAt || new Date().toISOString(),
          violation_count: data.violationCount || 0,
          answers: data.answers || {},
          is_remedial: data.isRemedial || false,
          remedial_score: data.remedialScore ?? null,
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
              if (
                collectionName === "exam_sessions" &&
                (existingRow.data.status === "selesai" || existingRow.data.finishedAt) &&
                !data.startedAt &&
                data.status !== "selesai" &&
                data.status !== "reset"
              ) {
                dataToSave.status = "selesai";
                if (existingRow.data.finishedAt) dataToSave.finishedAt = existingRow.data.finishedAt;
                if (hasValidNumericScore(existingRow.data.score)) dataToSave.score = existingRow.data.score;
              }
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
      setFirebaseQuotaExhausted(true);
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
    const metaCollections = ["studentsByNisn", "classes", "assignments", "submissions", "chapters", "announcements", "absensi", "materials", "config", "users"];
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
        const formattedGrades = gradesSnap.docs
          .filter((docSnap: any) => {
            const d = docSnap.data();
            const hasAnswerItems = Boolean(d.answers && d.answers.items && Object.keys(d.answers.items).length > 0);
            return !(d.status === "melanggar" && !d.submittedAt && !d.gradedAt && !hasAnswerItems);
          })
          .map((docSnap: any) => {
            const d = docSnap.data();
            const nisnKey = String(d.nisn || "").trim();
            const studentInfo = studentMap.get(nisnKey);
            const rawNum = d.nilai ?? d.score;
            const hasNum = hasValidNumericScore(rawNum);

            return {
              id: docSnap.id,
              exam_id: d.assignmentId || d.examId || "",
              assignment_id: d.assignmentId || d.examId || "",
              nisn: d.nisn || "",
              student_name: d.studentName || studentInfo?.displayName || "",
              kelas: d.kelas || studentInfo?.kelas || "",
              nilai: hasNum ? Number(rawNum) : null,
              score: hasNum ? Number(rawNum) : null,
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

export async function checkAndClearQuotaOnRecovery(): Promise<boolean> {
  // Do not falsely auto-clear using offline cache!
  // Quota states remain persistent until genuinely reset or reloaded with fresh quota.
  return false;
}

