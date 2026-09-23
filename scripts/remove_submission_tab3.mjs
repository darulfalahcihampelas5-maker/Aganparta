import fs from "fs";

let content = fs.readFileSync("src/pages/DashboardStudent.tsx", "utf8");

content = content.replace(
  /\{\/\* TAB 2: LINK TUGAS GOOGLE DRIVE \/ CAMSCANNER \/ LAINNYA \*\/\}.*?\{\/\* Footer Buttons \*\/\}/s,
  `{/* Footer Buttons */}`
);

fs.writeFileSync("src/pages/DashboardStudent.tsx", content, "utf8");
