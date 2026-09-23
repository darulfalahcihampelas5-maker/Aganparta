import fs from "fs";

let content = fs.readFileSync("src/pages/DashboardStudent.tsx", "utf8");

content = content.replace(
  /const \[submissionTab, setSubmissionTab\] = useState<"scan" \| "link">\("scan"\);\n/s,
  ""
);

content = content.replace(
  /\{submissionTab === "scan" \? <Camera className="w-4 h-4" \/> : <Link className="w-4 h-4" \/>\}/s,
  `<Camera className="w-4 h-4" />`
);

fs.writeFileSync("src/pages/DashboardStudent.tsx", content, "utf8");
