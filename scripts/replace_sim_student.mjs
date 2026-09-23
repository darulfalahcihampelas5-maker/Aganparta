import fs from "fs";
let content = fs.readFileSync("src/pages/DashboardStudent.tsx", "utf8");

content = content.replace(
  `import { ComputationalThinkingSimulation } from "../components/simulation/ComputationalThinkingSimulation";`,
  `import { SimulasiChapterMenu } from "../components/simulation/SimulasiChapterMenu";`
);

content = content.replace(
  /<ComputationalThinkingSimulation\s+userRole="student"\s+currentUser=\{\{\s+name: student\?\.nama,\s+nisn: student\?\.nisn,\s+kelas: student\?\.kelas,\s+\}\}\s+\/>/,
  `<SimulasiChapterMenu
                    userRole="student"
                    currentUser={{
                      name: student?.nama,
                      nisn: student?.nisn,
                      kelas: student?.kelas,
                    }}
                  />`
);

fs.writeFileSync("src/pages/DashboardStudent.tsx", content, "utf8");
