import fs from "fs";
let content = fs.readFileSync("src/pages/DashboardStudent.tsx", "utf8");

content = content.replace(
  /<ComputationalThinkingSimulation[\s\S]*?onBackToDashboard=\{\(\) => setActiveMenu\("dashboard"\)\}\s*\/>/,
  `<SimulasiChapterMenu
                    userRole="student"
                    currentUser={{
                      name: student?.nama,
                      nisn: student?.nisn,
                      kelas: student?.kelas,
                    }}
                    onBackToDashboard={() => setActiveMenu("dashboard")}
                  />`
);

fs.writeFileSync("src/pages/DashboardStudent.tsx", content, "utf8");
