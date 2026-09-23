const asg = {
  targets: [{"deadline":"2026-08-31T15:59:00.000Z","publishedAt":"2026-08-26T16:59:00.000Z","kelas":"X3"},{"deadline":"2026-08-31T15:59:00.000Z","kelas":"X5","publishedAt":"2026-08-26T15:59:00.000Z"}]
};
const res = (function(asg, targetClass) {
  if (!asg) return false;
  if (!targetClass || targetClass === "SEMUA_KELAS" || targetClass === "ALL" || targetClass.trim() === "") {
    return true;
  }
  const cleanTarget = targetClass.trim().toLowerCase();
  
  if (Array.isArray(asg.targets) && asg.targets.length > 0) {
    return asg.targets.some((t) => {
      const k = (typeof t === "string" ? t : (t?.kelas || t?.name || "")).toString().trim().toLowerCase();
      return k === cleanTarget || k === "semua_kelas" || k === "all" || k === "semua kelas";
    });
  }
  return false;
})(asg, "X3");
console.log("Result:", res);
