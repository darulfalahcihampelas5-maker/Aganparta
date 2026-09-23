import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "isometric-density-gd2jw",
  appId: "1:369490798032:web:51c0810c5cc801e6fc05d5",
  apiKey: "AIzaSyD_tW8Opsi6ldKKomNM_e6JzmFGgmFro1I",
  authDomain: "isometric-density-gd2jw.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-sipinterapp-b6b570ca-f030-4ca8-b7cf-c83c6e4299ce");

async function run() {
  const ref = doc(db, "assignments", "TGS-1785884777808");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    let data = snap.data();
    let currentTargets = data.targets || [];
    let currentTargetClasses = data.targetClasses || [];
    
    if (!currentTargetClasses.includes("X3")) {
      currentTargetClasses.push("X3");
    }
    const hasX3 = currentTargets.find(t => t.kelas === "X3");
    if (!hasX3) {
      currentTargets.push({
        kelas: "X3",
        startDate: data.startDate || new Date().toISOString(),
        publishedAt: data.publishedAt || new Date().toISOString(),
        deadline: data.deadline || new Date().toISOString()
      });
    }
    
    await updateDoc(ref, {
      targets: currentTargets,
      targetClasses: currentTargetClasses,
      kelas: "X7, X3" // fallback update
    });
    console.log("Updated TGS-1785884777808 to include X3");
  }
}
run().catch(console.error);
