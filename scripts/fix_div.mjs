import fs from "fs";

let content = fs.readFileSync("src/pages/DashboardStudent.tsx", "utf8");

content = content.replace(
  /              \{\/\* Footer Buttons \*\/\}/s,
  `            </div>\n              {/* Footer Buttons */}`
);

fs.writeFileSync("src/pages/DashboardStudent.tsx", content, "utf8");
