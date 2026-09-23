import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export interface SimulationProgress {
  nisn: string;
  studentName: string;
  completedIds: string[]; // List of completed simulator IDs (e.g. "dek-1", "pol-2")
  scores: Record<string, number>; // id -> score (0-100)
  stars: Record<string, number>; // id -> stars (1-3)
  lastUpdated: string;
  totalScore: number;
  totalStars: number;
}

const STORAGE_KEY_PREFIX = "sipinter_sim_progress_";

/**
 * Load simulation progress from LocalStorage first, then attempt cloud sync
 */
export function loadLocalProgress(nisn: string): SimulationProgress {
  const defaultProgress: SimulationProgress = {
    nisn: nisn || "guest",
    studentName: "Siswa Informatika",
    completedIds: [],
    scores: {},
    stars: {},
    lastUpdated: new Date().toISOString(),
    totalScore: 0,
    totalStars: 0,
  };

  if (!nisn) return defaultProgress;

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${nisn}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultProgress,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn("Failed to load local simulation progress:", err);
  }

  return defaultProgress;
}

/**
 * Save simulation progress locally and safely sync to Supabase if configured
 */
export async function saveSimulationProgress(
  nisn: string,
  studentName: string,
  simulatorId: string,
  score: number,
  stars: number
): Promise<SimulationProgress> {
  const current = loadLocalProgress(nisn);
  const updatedCompletedIds = Array.from(new Set([...current.completedIds, simulatorId]));
  const updatedScores = {
    ...current.scores,
    [simulatorId]: Math.max(current.scores[simulatorId] || 0, score),
  };
  const updatedStars = {
    ...current.stars,
    [simulatorId]: Math.max(current.stars[simulatorId] || 0, stars),
  };

  const totalScore = Object.values(updatedScores).reduce((a, b) => a + b, 0);
  const totalStars = Object.values(updatedStars).reduce((a, b) => a + b, 0);

  const updatedProgress: SimulationProgress = {
    nisn: nisn || "guest",
    studentName: studentName || current.studentName,
    completedIds: updatedCompletedIds,
    scores: updatedScores,
    stars: updatedStars,
    lastUpdated: new Date().toISOString(),
    totalScore,
    totalStars,
  };

  // 1. Save to Local Storage (100% Guaranteed instant offline-first)
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${nisn}`, JSON.stringify(updatedProgress));
  } catch (err) {
    console.warn("LocalStorage save error:", err);
  }

  // 2. Safe Supabase Sync (Non-blocking, silent fallback if table isn't migrated)
  if (isSupabaseConfigured && supabase && nisn && nisn !== "guest") {
    try {
      // Upsert into final_grades under assignment_id = 'simulasi_bk_komputasional'
      const payload = {
        id: `sim_bk_${nisn}`,
        nisn: nisn,
        student_name: studentName || "Siswa Informatika",
        assignment_id: "simulasi_bk_komputasional",
        score: Math.round(totalScore / Math.max(1, updatedCompletedIds.length)),
        nilai: Math.round(totalScore / Math.max(1, updatedCompletedIds.length)),
        submitted_at: new Date().toISOString(),
        answers: {
          completedCount: updatedCompletedIds.length,
          totalStars,
          completedIds: updatedCompletedIds,
          scores: updatedScores,
        },
      };

      await supabase.from("final_grades").upsert(payload, { onConflict: "id" });
    } catch (supabaseErr) {
      // Graceful catch: Supabase failures do NOT break student interaction
      console.info("Supabase sync note: Continuing with safe local storage fallback.", supabaseErr);
    }
  }

  return updatedProgress;
}

/**
 * Reset a student's entire simulation progress (for teachers when student makes mistakes or remedial)
 */
export async function resetStudentProgress(nisn: string): Promise<boolean> {
  if (!nisn) return false;

  // 1. Reset in LocalStorage
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${nisn}`);
    // Also remove classic progress key if exists
    localStorage.removeItem(`sipinter_sim_progress_${nisn}`);
  } catch (err) {
    console.warn("LocalStorage reset error:", err);
  }

  // 2. Reset in Supabase
  if (isSupabaseConfigured && supabase && nisn !== "guest") {
    try {
      await supabase
        .from("final_grades")
        .delete()
        .eq("id", `sim_bk_${nisn}`);
    } catch (supabaseErr) {
      console.warn("Supabase reset error:", supabaseErr);
    }
  }

  return true;
}

/**
 * Reset a specific challenge/simulator for a student so other completed challenges are preserved
 */
export async function resetSpecificLevelProgress(
  nisn: string,
  simulatorId: string
): Promise<SimulationProgress> {
  const current = loadLocalProgress(nisn);
  const updatedCompletedIds = current.completedIds.filter((id) => id !== simulatorId);
  
  const updatedScores = { ...current.scores };
  delete updatedScores[simulatorId];

  const updatedStars = { ...current.stars };
  delete updatedStars[simulatorId];

  const totalScore = Object.values(updatedScores).reduce((a, b) => a + b, 0);
  const totalStars = Object.values(updatedStars).reduce((a, b) => a + b, 0);

  const updatedProgress: SimulationProgress = {
    ...current,
    completedIds: updatedCompletedIds,
    scores: updatedScores,
    stars: updatedStars,
    totalScore,
    totalStars,
    lastUpdated: new Date().toISOString(),
  };

  // 1. Save to LocalStorage
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${nisn}`, JSON.stringify(updatedProgress));
  } catch (err) {
    console.warn("LocalStorage save error:", err);
  }

  // 2. Sync to Supabase
  if (isSupabaseConfigured && supabase && nisn && nisn !== "guest") {
    try {
      const avgScore = updatedCompletedIds.length > 0 ? Math.round(totalScore / updatedCompletedIds.length) : 0;
      const payload = {
        id: `sim_bk_${nisn}`,
        nisn: nisn,
        student_name: current.studentName || "Siswa Informatika",
        assignment_id: "simulasi_bk_komputasional",
        score: avgScore,
        nilai: avgScore,
        submitted_at: new Date().toISOString(),
        answers: {
          completedCount: updatedCompletedIds.length,
          totalStars,
          completedIds: updatedCompletedIds,
          scores: updatedScores,
        },
      };
      await supabase.from("final_grades").upsert(payload, { onConflict: "id" });
    } catch (supabaseErr) {
      console.warn("Supabase update error after reset single level:", supabaseErr);
    }
  }

  return updatedProgress;
}

/**
 * Reset all students' simulation progress (Mass reset for teacher)
 */
export async function resetAllStudentsProgress(): Promise<boolean> {
  // 1. LocalStorage
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn("LocalStorage mass reset error:", err);
  }

  // 2. Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("final_grades")
        .delete()
        .eq("assignment_id", "simulasi_bk_komputasional");
    } catch (supabaseErr) {
      console.warn("Supabase mass reset error:", supabaseErr);
    }
  }

  return true;
}

export interface StudentSimOverview {
  nisn: string;
  studentName: string;
  kelas?: string;
  completedCount: number;
  totalStars: number;
  avgScore: number;
  lastUpdated: string;
  progress: SimulationProgress;
}

/**
 * Fetch all students with simulation progress from LocalStorage and Supabase
 */
export async function getAllSimulatedStudents(): Promise<StudentSimOverview[]> {
  const mapByNisn: Map<string, StudentSimOverview> = new Map();

  // 1. Scan LocalStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const nisn = key.replace(STORAGE_KEY_PREFIX, "");
        if (nisn && nisn !== "guest" && nisn !== "default") {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed: SimulationProgress = JSON.parse(raw);
            const count = parsed.completedIds?.length || 0;
            const avg = count > 0 ? Math.round((parsed.totalScore || 0) / count) : 0;
            mapByNisn.set(nisn, {
              nisn,
              studentName: parsed.studentName || "Siswa " + nisn,
              completedCount: count,
              totalStars: parsed.totalStars || 0,
              avgScore: avg,
              lastUpdated: parsed.lastUpdated || new Date().toISOString(),
              progress: parsed,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("LocalStorage scan error:", err);
  }

  // 2. Query Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("final_grades")
        .select("*")
        .eq("assignment_id", "simulasi_bk_komputasional");

      if (!error && Array.isArray(data)) {
        data.forEach((row: any) => {
          const nisn = row.nisn;
          if (nisn) {
            const answers = row.answers || {};
            const completedIds = Array.isArray(answers.completedIds) ? answers.completedIds : [];
            const scores = answers.scores || {};
            const count = completedIds.length;
            const totalScore = Object.values(scores).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number;
            const totalStars = Number(answers.totalStars) || 0;
            const avg = count > 0 ? Math.round(totalScore / count) : (Number(row.nilai) || Number(row.score) || 0);

            // Merge or set
            const existing = mapByNisn.get(nisn);
            if (!existing || existing.completedCount < count) {
              mapByNisn.set(nisn, {
                nisn,
                studentName: row.student_name || existing?.studentName || "Siswa " + nisn,
                kelas: row.kelas || existing?.kelas,
                completedCount: count,
                totalStars,
                avgScore: avg,
                lastUpdated: row.submitted_at || new Date().toISOString(),
                progress: {
                  nisn,
                  studentName: row.student_name || "Siswa",
                  completedIds,
                  scores,
                  stars: answers.stars || {},
                  lastUpdated: row.submitted_at || new Date().toISOString(),
                  totalScore,
                  totalStars,
                },
              });
            }
          }
        });
      }
    } catch (supabaseErr) {
      console.warn("Supabase fetch student simulations error:", supabaseErr);
    }
  }

  return Array.from(mapByNisn.values()).sort((a, b) => b.completedCount - a.completedCount);
}
