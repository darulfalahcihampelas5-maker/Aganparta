const normalize = (cls: string) => {
  let norm = (cls || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^(kelas|tingkat|rombel|jenjang)\s*/i, "");

  // Fase equivalents
  norm = norm.replace(/^fase\s*e/i, "10");
  norm = norm.replace(/^fase\s*f/i, "11"); // Treat Fase F as 11 generally

  // Roman to Arabic (only at start)
  norm = norm.replace(/^xii\b/i, "12 ");
  norm = norm.replace(/^xii(\d)/i, "12 $1");
  
  norm = norm.replace(/^xi\b/i, "11 ");
  norm = norm.replace(/^xi(\d)/i, "11 $1");

  norm = norm.replace(/^x\b/i, "10 ");
  norm = norm.replace(/^x(\d)/i, "10 $1");

  return norm.replace(/[\s\-_.]+/g, "");
}

console.log("X 3 ->", normalize("X 3"));
console.log("X3 ->", normalize("X3"));
console.log("10.3 ->", normalize("10.3"));
console.log("XI 2 ->", normalize("XI 2"));
console.log("XI2 ->", normalize("XI2"));
console.log("11-2 ->", normalize("11-2"));
console.log("XII IPS ->", normalize("XII IPS"));
console.log("Fase E 3 ->", normalize("Fase E 3"));
