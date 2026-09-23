import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
const firebaseConfig = {
  projectId: "isometric-density-gd2jw",
  appId: "1:369490798032:web:51c0810c5cc801e6fc05d5",
  apiKey: "AIzaSyD_tW8Opsi6ldKKomNM_e6JzmFGgmFro1I",
  authDomain: "isometric-density-gd2jw.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-sipinterapp-b6b570ca-f030-4ca8-b7cf-c83c6e4299ce");
async function run() {
  const querySnapshot = await getDocs(collection(db, "submissions"));
  const subs = querySnapshot.docs.map(d => ({id: d.id, ...d.data()}));
  const x3subs = subs.filter(s => s.kelas === "X3" && s.assignmentId === "TGS-1785884777808");
  console.log("Submissions for X3 in Tugas 1:", x3subs.length);
}
run().catch(console.error);
