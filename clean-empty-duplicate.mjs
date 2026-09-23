import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "isometric-density-gd2jw",
  appId: "1:369490798032:web:51c0810c5cc801e6fc05d5",
  apiKey: "AIzaSyD_tW8Opsi6ldKKomNM_e6JzmFGgmFro1I",
  authDomain: "isometric-density-gd2jw.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-sipinterapp-b6b570ca-f030-4ca8-b7cf-c83c6e4299ce");

async function run() {
  const targetId = "EXM-MANUAL-1788854180609";
  const docRef = doc(db, "exams", targetId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log("Deleting empty duplicate exam:", targetId, snap.data());
    await deleteDoc(docRef);
    console.log("Successfully deleted empty duplicate.");
  } else {
    console.log("Exam does not exist or already deleted.");
  }
  process.exit(0);
}
run();
