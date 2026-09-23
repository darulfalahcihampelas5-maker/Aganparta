import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";
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
  const snap1 = await getDoc(doc(db, "exams", "EXM-MANUAL-1788851800983"));
  const exam1 = { id: snap1.id, ...snap1.data() };
  console.log("Exam 1:", exam1);

  const snap2 = await getDoc(doc(db, "exams", "EXM-MANUAL-1788854180609"));
  const exam2 = { id: snap2.id, ...snap2.data() };
  console.log("Exam 2:", exam2);

  console.log("\nisExamForClass(exam1, 'X4'):", isExamForClass(exam1, "X4"));
  console.log("isExamForClass(exam1, 'Semua Kelas'):", isExamForClass(exam1, "Semua Kelas"));
  console.log("isExamForClass(exam1, ''):", isExamForClass(exam1, ""));

  process.exit(0);
}
check();
