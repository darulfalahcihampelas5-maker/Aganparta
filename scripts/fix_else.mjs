import fs from "fs";

let content = fs.readFileSync("src/pages/DashboardStudent.tsx", "utf8");

const parts = content.split("} else {\n                    // Link submission mode");

if (parts.length === 2) {
  const part2 = parts[1];
  // find the end of the onClick block which is `className="h-12 rounded-xl bg-slate-950`
  const endMarker = `className="h-12 rounded-xl bg-slate-950`;
  const endIndex = part2.indexOf(endMarker);
  
  if (endIndex !== -1) {
    // we need to close the `try` block or `if` block, let's see.
    // the previous block is:
    // } finally {
    //   setIsUploading(false);
    // }
    // } else { ...
    // we just need to replace the `else { ... }` with nothing, but wait, there was an `if (submissionTab === "scan") {` earlier which we removed in the previous script?
    // Let me check if `if (submissionTab === "scan") {` is still there.
    content = parts[0] + "                  }\n                }}\n                " + part2.slice(endIndex);
    fs.writeFileSync("src/pages/DashboardStudent.tsx", content, "utf8");
    console.log("Fixed!");
  } else {
    console.log("End marker not found");
  }
} else {
  console.log("Split failed", parts.length);
}
