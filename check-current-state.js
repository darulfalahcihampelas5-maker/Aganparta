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
  console.log("=== CHECKING ASSIGNMENTS ===");
  const asgSnap = await getDocs(collection(db, "assignments"));
  console.log("Total assignments in DB:", asgSnap.size);
  asgSnap.forEach(d => {
    console.log(`- ID: ${d.id} | title: ${d.data().title || d.data().materi} | kelas: ${d.data().kelas} | targetClasses: ${JSON.stringify(d.data().targetClasses)}`);
  });

  console.log("\n=== CHECKING SUBMISSIONS ===");
  const subSnap = await getDocs(collection(db, "submissions"));
  console.log("Total submissions in DB:", subSnap.size);
  const asgIdsInSubs = new Set();
  subSnap.forEach(d => {
    asgIdsInSubs.add(d.data().assignmentId);
  });
  console.log("Assignment IDs referenced in submissions:", Array.from(asgIdsInSubs));
}

check().catch(console.error);
