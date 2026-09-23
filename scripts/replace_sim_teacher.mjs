import fs from "fs";
let content = fs.readFileSync("src/pages/DashboardTeacher.tsx", "utf8");

content = content.replace(
  `import { ComputationalThinkingSimulation } from "../components/simulation/ComputationalThinkingSimulation";`,
  `import { SimulasiChapterMenu } from "../components/simulation/SimulasiChapterMenu";`
);

content = content.replace(
  /<SimulasiBKSettings classesList=\{classesList\} \/>\s*<ComputationalThinkingSimulation[\s\S]*?onBackToDashboard=\{\(\) => setActiveMenu\("dashboard"\)\}\s*\/>/,
  `<SimulasiChapterMenu
                        userRole="teacher"
                        currentUser={{
                          name: "Guru Pengampu Informatika",
                          kelas: selectedClassFilter || "Kelas X",
                        }}
                        onBackToDashboard={() => setActiveMenu("dashboard")}
                      >
                        <SimulasiBKSettings classesList={classesList} />
                      </SimulasiChapterMenu>`
);

fs.writeFileSync("src/pages/DashboardTeacher.tsx", content, "utf8");
