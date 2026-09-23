import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import { isAssignmentForClass, isExamForClass } from "./src/lib/gradeUtils.ts";

const firebaseConfig = {
  projectId: "isometric-density-gd2jw",
  appId: "1:369490798032:web:51c0810c5cc801e6fc05d5",
  apiKey: "AIzaSyD_tW8Opsi6ldKKomNM_e6JzmFGgmFro1I",
  authDomain: "isometric-density-gd2jw.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-sipinterapp-b6b570ca-f030-4ca8-b7cf-c83c6e4299ce");

async function check() {
  console.log("=== CLASSES ===");
  const clsSnap = await getDocs(collection(db, "classes"));
  clsSnap.forEach(d => console.log(d.id, "=>", d.data()));

  console.log("\n=== STUDENTS IN X4 ===");
  const stuSnap = await getDocs(collection(db, "studentsByNisn"));
  const x4Students = [];
  stuSnap.forEach(d => {
    const s = d.data();
    if (s.kelas && s.kelas.includes("4")) {
      x4Students.push({ id: d.id, nisn: s.nisn, name: s.name || s.displayName || s.studentName, kelas: s.kelas });
    }
  });
  console.log("X4 students count:", x4Students.length);
  console.log("Sample X4 students:", x4Students.slice(0, 5));

  console.log("\n=== ALL EXAMS FILTER CHECK ===");
  const examSnap = await getDocs(collection(db, "exams"));
  examSnap.forEach(d => {
    const exam = { id: d.id, ...d.data() };
    console.log(exam.id, exam.title, "-> for X4?", isExamForClass(exam, "X4"), "-> for '':", isExamForClass(exam, ""));
  });

  console.log("\n=== ALL ASSIGNMENTS FILTER CHECK ===");
  const asgSnap = await getDocs(collection(db, "assignments"));
  asgSnap.forEach(d => {
    const asg = { id: d.id, ...d.data() };
    console.log(asg.id, asg.title, "-> for X4?", isAssignmentForClass(asg, "X4"), "-> for '':", isAssignmentForClass(asg, ""));
  });

  console.log("\n=== GRADES FOR EXM-MANUAL-1788851800983 ===");
  const fgSnap = await getDocs(collection(db, "final_grades"));
  const fgForExam1 = [];
  fgSnap.forEach(d => {
    const data = d.data();
    if (data.assignmentId === "EXM-MANUAL-1788851800983" || d.id.startsWith("EXM-MANUAL-1788851800983")) {
      fgForExam1.push({ id: d.id, ...data });
    }
  });
  console.log("Count of final_grades for EXM-MANUAL-1788851800983:", fgForExam1.length);
  if (fgForExam1.length > 0) {
    console.log("Sample grade for EXM-MANUAL-1788851800983:", fgForExam1[0]);
  }

  console.log("\n=== GRADES FOR EXM-MANUAL-1788854180609 ===");
  const fgForExam2 = [];
  fgSnap.forEach(d => {
    const data = d.data();
    if (data.assignmentId === "EXM-MANUAL-1788854180609" || d.id.startsWith("EXM-MANUAL-1788854180609")) {
      fgForExam2.push({ id: d.id, ...data });
    }
  });
  console.log("Count of final_grades for EXM-MANUAL-1788854180609:", fgForExam2.length);

  process.exit(0);
}
check();
