import fs from "fs";

let content = fs.readFileSync("src/pages/DashboardStudent.tsx", "utf8");

content = content.replace(
  /\} finally \{\s*setIsUploading\(false\);\s*\}\s*\}\s*\}\}\s*className=/s,
  `} finally {
                      setIsUploading(false);
                    }
                }}
                className=`
);

fs.writeFileSync("src/pages/DashboardStudent.tsx", content, "utf8");
