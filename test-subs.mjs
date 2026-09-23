import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "isometric-density-gd2jw",
  appId: "1:369490798032:web:51c0810c5cc801e6fc05d5",
  apiKey: "AIzaSyD_tW8Opsi6ldKKomNM_e6JzmFGgmFro1I",
  authDomain: "isometric-density-gd2jw.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-sipinterapp-b6b570ca-f030-4ca8-b7cf-c83c6e4299ce");

async function check() {
  const subSnap = await getDocs(collection(db, "submissions"));
  const exm1Subs = [];
  subSnap.forEach(d => {
    const data = d.data();
    if (data.assignmentId === "EXM-MANUAL-1788851800983" || d.id.includes("EXM-MANUAL-1788851800983")) {
      exm1Subs.push({ id: d.id, ...data });
    }
  });
  console.log("EXM-MANUAL-1788851800983 submissions count:", exm1Subs.length);
  if (exm1Subs.length > 0) {
    console.log("Sample submission:", exm1Subs[0]);
    console.log("Classes in these submissions:", [...new Set(exm1Subs.map(s => s.kelas))]);
  }

  const exm2Subs = [];
  subSnap.forEach(d => {
    const data = d.data();
    if (data.assignmentId === "EXM-MANUAL-1788854180609" || d.id.includes("EXM-MANUAL-1788854180609")) {
      exm2Subs.push({ id: d.id, ...data });
    }
  });
  console.log("EXM-MANUAL-1788854180609 submissions count:", exm2Subs.length);

  process.exit(0);
}
check();
