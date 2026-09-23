import fs from "fs";
let lines = fs.readFileSync("src/pages/DashboardStudent.tsx", "utf8").split('\n');
let count = 0;
for(let i = 7300; i < 7725; i++) {
  let line = lines[i];
  if(line.includes("true && (")) console.log("OPEN at", i);
  if(line.includes(")}")) console.log("CLOSE at", i);
}
