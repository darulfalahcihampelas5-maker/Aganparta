import { isAssignmentForClass } from "./src/lib/gradeUtils";
const asg = {
  "teacherId": "mock-admin",
  "targets": [
    { "kelas": "X7" },
    { "kelas": "X3" }
  ],
  "kelasRef": "X7",
  "type": "Tugas",
  "materi": "Tugas 1",
  "targetClasses": [ "X7", "X3" ],
  "id": "TGS-1785884777808",
  "kelas": "X7, X3, X3",
};
console.log("X3:", isAssignmentForClass(asg, "X3"));
console.log("X7:", isAssignmentForClass(asg, "X7"));
