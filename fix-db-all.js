import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc, getDocs, collection } from "firebase/firestore";

const firebaseConfig = {
  projectId: "isometric-density-gd2jw",
  appId: "1:369490798032:web:51c0810c5cc801e6fc05d5",
  apiKey: "AIzaSyD_tW8Opsi6ldKKomNM_e6JzmFGgmFro1I",
  authDomain: "isometric-density-gd2jw.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-sipinterapp-b6b570ca-f030-4ca8-b7cf-c83c6e4299ce");

async function run() {
  const querySnapshot = await getDocs(collection(db, "assignments"));
  for(let d of querySnapshot.docs) {
    if (d.data().title === "Tugas 1" || d.data().materi === "Tugas 1") {
       let data = d.data();
       let currentTargets = data.targets || [];
       let currentTargetClasses = data.targetClasses || [];
       if (!currentTargetClasses.includes("X3")) {
          currentTargetClasses.push("X3");
       }
       if (!currentTargets.find(t => t.kelas === "X3")) {
          currentTargets.push({
             kelas: "X3",
             startDate: data.startDate || new Date().toISOString(),
             publishedAt: data.publishedAt || new Date().toISOString(),
             deadline: data.deadline || new Date().toISOString()
          });
       }
       await updateDoc(doc(db, "assignments", d.id), {
          targets: currentTargets,
          targetClasses: currentTargetClasses,
          kelas: data.kelas + ", X3"
       });
       console.log("Updated " + d.id);
    }
  }
}
run().catch(console.error);
