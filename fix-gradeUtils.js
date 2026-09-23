const fs = require('fs');
let code = fs.readFileSync('src/lib/gradeUtils.ts', 'utf-8');
code = code.replace(/export const isAssignmentForClass = \(asg: any, targetClass\?: string\): boolean => \{/, `export const isAssignmentForClass = (asg: any, targetClass?: string): boolean => {
  if (!asg) return false;
  if (!targetClass || targetClass === "SEMUA_KELAS" || targetClass === "ALL" || targetClass.trim() === "") {
    return true;
  }
  const cleanTarget = targetClass.trim().toLowerCase();

  // Try to match targets
  if (Array.isArray(asg.targets) && asg.targets.some((t: any) => {
    const k = (typeof t === "string" ? t : (t?.kelas || t?.name || "")).toString().trim().toLowerCase();
    return k === cleanTarget || k === "semua_kelas" || k === "all" || k === "semua kelas";
  })) return true;

  // Try to match targetClasses
  if (Array.isArray(asg.targetClasses) && asg.targetClasses.some((k: any) => {
    const cls = (k || "").toString().trim().toLowerCase();
    return cls === cleanTarget || cls === "semua_kelas" || cls === "all" || cls === "semua kelas";
  })) return true;
  
  if (asg.kelasRef) {
    const rawRef = asg.kelasRef.toString().trim().toLowerCase();
    if (rawRef === "semua_kelas" || rawRef === "all" || rawRef === "semua kelas") return true;
    if (rawRef.split(",").map((s: string) => s.trim()).includes(cleanTarget)) return true;
  }
  
  if (asg.kelas) {
    const rawKelas = asg.kelas.toString().trim().toLowerCase();
    if (rawKelas === "semua_kelas" || rawKelas === "all" || rawKelas === "semua kelas") return true;
    if (rawKelas.split(",").map((s: string) => s.trim()).includes(cleanTarget)) return true;
  }
  
  return false;
};
function dummy() {`);
// wait I can just overwrite it using echo or cat since I know the whole file.
