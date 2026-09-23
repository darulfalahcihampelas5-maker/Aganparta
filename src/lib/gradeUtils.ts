/**
 * Utility functions for verifying if an assignment or exam is published/targeted
 * to a specific class.
 */

export const normalizeClassName = (cls: string): string => {
  let norm = (cls || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^(kelas|tingkat|rombel|jenjang)\s*/i, "");

  // Convert Phase to generic grades
  norm = norm.replace(/^fase\s*e/i, "10");
  norm = norm.replace(/^fase\s*f/i, "11");

  // Convert Roman numerals to Arabic (handling spacing or no spacing)
  norm = norm.replace(/^xii\b/i, "12 ");
  norm = norm.replace(/^xii(\d)/i, "12 $1");
  
  norm = norm.replace(/^xi\b/i, "11 ");
  norm = norm.replace(/^xi(\d)/i, "11 $1");

  norm = norm.replace(/^x\b/i, "10 ");
  norm = norm.replace(/^x(\d)/i, "10 $1");

  // Remove all spaces, dots, dashes
  return norm.replace(/[\s\-_.]+/g, "");
};

export const isAllClasses = (cls: string): boolean => {
  if (!cls) return true;
  const raw = cls.toString().toLowerCase().trim();
  const norm = normalizeClassName(cls);

  if (
    norm.includes("semuakelas") ||
    norm.includes("all") ||
    norm.includes("semua") ||
    norm.includes("seluruhkelas") ||
    norm.includes("pilihjalurkelas") ||
    norm.includes("semuatugasaktif") ||
    norm.includes("umum") ||
    norm.includes("global") ||
    norm.includes("gabungan") ||
    raw === "semua kelas" ||
    raw === "all" ||
    raw === "semua" ||
    raw === "umum" ||
    raw === "global"
  ) {
    return true;
  }

  return false;
};

export const isSameNisn = (a?: string | number | null, b?: string | number | null): boolean => {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  const strA = String(a).trim();
  const strB = String(b).trim();
  if (!strA || !strB) return false;
  if (strA === strB) return true;
  const normA = strA.replace(/^0+/, "");
  const normB = strB.replace(/^0+/, "");
  if (normA && normB && normA === normB) return true;
  const padA = strA.padStart(10, "0");
  const padB = strB.padStart(10, "0");
  return padA === padB;
};

export const isUniversalExam = (exam: any): boolean => {
  if (!exam) return false;
  // EXM-1785285114939 is the universal Pretest "Preetes - Bab 1 ikg" taken by all classes
  if (exam.id === "EXM-1785285114939" || exam.assignmentId === "EXM-1785285114939") return true;
  if (exam.isUniversal || exam.universal || exam.forAllClasses) return true;
  return false;
};

export const isClassMatch = (classA: string, classB: string): boolean => {
  if (isAllClasses(classA) || isAllClasses(classB)) return true;
  
  const normA = normalizeClassName(classA);
  const normB = normalizeClassName(classB);
  
  if (normA === normB) return true;

  // Generic grade identifiers
  const generic10 = ["10", "fasee", "fasee10"];
  const generic11 = ["11", "fasef", "fasef11"];
  const generic12 = ["12", "fasef12"];

  // Match if one side is a generic grade identifier and the other side belongs to that grade
  if (generic10.includes(normA) && normB.startsWith("10")) return true;
  if (generic10.includes(normB) && normA.startsWith("10")) return true;

  if (generic11.includes(normA) && normB.startsWith("11")) return true;
  if (generic11.includes(normB) && normA.startsWith("11")) return true;

  if (generic12.includes(normA) && normB.startsWith("12")) return true;
  if (generic12.includes(normB) && normA.startsWith("12")) return true;

  return false;
};

const extractClassName = (k: any): string => {
  if (!k) return "";
  if (typeof k === "string") return k;
  return (k.kelas || k.name || k.className || k.title || k.id || k.label || k.rombel || k.grade || "").toString();
};

export const isAssignmentForClass = (asg: any, targetClass?: string): boolean => {
  if (!asg) return false;
  
  if (!targetClass || isAllClasses(targetClass)) {
    return true;
  }

  // 1. Explicit targets array (highest priority for multi-class assignments)
  if (Array.isArray(asg.targets) && asg.targets.length > 0) {
    if (asg.targets.some((t: any) => isAllClasses(extractClassName(t)))) return true;
    return asg.targets.some((t: any) => isClassMatch(extractClassName(t), targetClass));
  }

  // 2. targetClasses array
  if (Array.isArray(asg.targetClasses) && asg.targetClasses.length > 0) {
    if (asg.targetClasses.some((k: any) => isAllClasses(extractClassName(k)))) return true;
    return asg.targetClasses.some((k: any) => isClassMatch(extractClassName(k), targetClass));
  }

  // 3. selectedClasses array
  if (Array.isArray(asg.selectedClasses) && asg.selectedClasses.length > 0) {
    if (asg.selectedClasses.some((k: any) => isAllClasses(extractClassName(k)))) return true;
    return asg.selectedClasses.some((k: any) => isClassMatch(extractClassName(k), targetClass));
  }

  // 4. classes array
  if (Array.isArray(asg.classes) && asg.classes.length > 0) {
    if (asg.classes.some((k: any) => isAllClasses(extractClassName(k)))) return true;
    return asg.classes.some((k: any) => isClassMatch(extractClassName(k), targetClass));
  }

  // 5. kelasRef property
  if (asg.kelasRef) {
    const rawRef = asg.kelasRef.toString();
    if (isAllClasses(rawRef)) return true;
    const splitClasses = rawRef.split(",").map((s: string) => s.trim());
    return splitClasses.some((s: string) => isClassMatch(s, targetClass));
  }

  // 6. kelas property fallback
  if (asg.kelas) {
    const rawKelas = asg.kelas.toString();
    if (isAllClasses(rawKelas)) return true;
    const splitClasses = rawKelas.split(",").map((s: string) => s.trim());
    return splitClasses.some((s: string) => isClassMatch(s, targetClass));
  }

  // 7. class / grade / rombel properties
  if (asg.class) return isClassMatch(asg.class, targetClass);
  if (asg.grade) return isClassMatch(asg.grade, targetClass);
  if (asg.rombel) return isClassMatch(asg.rombel, targetClass);

  // 8. If no class constraints are defined at all on the document, treat as all classes
  return true;
};

export const isPTSItem = (item: any): boolean => {
  if (!item) return false;
  const category = (item.category || "").toString().toLowerCase();
  const title = (item.title || item.materi || "").toString().toLowerCase();
  if (category === "penilaian tengah semester" || category === "pts" || category === "uts") return true;
  return /\b(pts|uts)\b/i.test(title) || /tengah\s*semester/i.test(title) || /tengah\s*semester/i.test(category);
};

export const isPASItem = (item: any): boolean => {
  if (!item) return false;
  const category = (item.category || "").toString().toLowerCase();
  const title = (item.title || item.materi || "").toString().toLowerCase();
  if (
    category === "penilaian sumatif akhir semester" ||
    category === "pas" ||
    category === "sas" ||
    category === "uas"
  )
    return true;
  return (
    /\b(pas|sas|uas)\b/i.test(title) ||
    /akhir\s*semester/i.test(title) ||
    /sumatif\s*akhir/i.test(title) ||
    /akhir\s*semester/i.test(category) ||
    /sumatif\s*akhir/i.test(category)
  );
};

export const isExamForClass = (exam: any, targetClass?: string): boolean => {
  if (!exam) return false;

  // Universal Pretest or explicitly marked universal
  if (isUniversalExam(exam)) return true;

  if (!targetClass || isAllClasses(targetClass)) {
    return true;
  }

  // 1. targetClasses array
  if (Array.isArray(exam.targetClasses) && exam.targetClasses.length > 0) {
    if (exam.targetClasses.some((k: any) => isAllClasses(extractClassName(k)))) return true;
    return exam.targetClasses.some((k: any) => isClassMatch(extractClassName(k), targetClass));
  }

  // 2. Explicit targets array
  if (Array.isArray(exam.targets) && exam.targets.length > 0) {
    if (exam.targets.some((t: any) => isAllClasses(extractClassName(t)))) return true;
    return exam.targets.some((t: any) => isClassMatch(extractClassName(t), targetClass));
  }

  // 3. selectedClasses array
  if (Array.isArray(exam.selectedClasses) && exam.selectedClasses.length > 0) {
    if (exam.selectedClasses.some((k: any) => isAllClasses(extractClassName(k)))) return true;
    return exam.selectedClasses.some((k: any) => isClassMatch(extractClassName(k), targetClass));
  }

  // 4. classes array
  if (Array.isArray(exam.classes) && exam.classes.length > 0) {
    if (exam.classes.some((k: any) => isAllClasses(extractClassName(k)))) return true;
    return exam.classes.some((k: any) => isClassMatch(extractClassName(k), targetClass));
  }

  // 5. kelasRef property
  if (exam.kelasRef) {
    const rawRef = exam.kelasRef.toString();
    if (isAllClasses(rawRef)) return true;
    const splitClasses = rawRef.split(",").map((s: string) => s.trim());
    return splitClasses.some((s: string) => isClassMatch(s, targetClass));
  }

  // 6. kelas property fallback
  if (exam.kelas) {
    const rawKelas = exam.kelas.toString();
    if (isAllClasses(rawKelas)) return true;
    const splitClasses = rawKelas.split(",").map((s: string) => s.trim());
    return splitClasses.some((s: string) => isClassMatch(s, targetClass));
  }

  // 7. class / grade / rombel properties
  if (exam.class) return isClassMatch(exam.class, targetClass);
  if (exam.grade) return isClassMatch(exam.grade, targetClass);
  if (exam.rombel) return isClassMatch(exam.rombel, targetClass);

  // 8. If no class constraints are defined at all on the document, treat as all classes (e.g. Pretest / Posttest / Umum)
  return true;
};
