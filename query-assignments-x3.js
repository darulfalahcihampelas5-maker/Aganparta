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

// Simulated isAssignmentForClass
const isAssignmentForClass = (asg, targetClass) => {
  if (!asg) return false;
  if (!targetClass || targetClass === "SEMUA_KELAS" || targetClass === "ALL" || targetClass.trim() === "") {
    return true;
  }
  const cleanTarget = targetClass.trim().toLowerCase();
  
  if (Array.isArray(asg.targets) && asg.targets.length > 0) {
    return asg.targets.some((t) => {
      const k = (typeof t === "string" ? t : (t?.kelas || t?.name || "")).toString().trim().toLowerCase();
      return k === cleanTarget || k === "semua_kelas" || k === "all" || k === "semua kelas";
    });
  }
  
  if (Array.isArray(asg.targetClasses) && asg.targetClasses.length > 0) {
    return asg.targetClasses.some((k) => {
      const cls = (k || "").toString().trim().toLowerCase();
      return cls === cleanTarget || cls === "semua_kelas" || cls === "all" || cls === "semua kelas";
    });
  }
  
  const singleCls = (asg.kelas || asg.kelasRef || "").toString().trim().toLowerCase();
  if (singleCls === cleanTarget || singleCls === "semua_kelas" || singleCls === "all" || singleCls === "semua kelas") {
    return true;
  }
  
  if (asg.kelas && asg.kelas.includes(",")) {
    const arr = asg.kelas.split(",").map(s => s.trim().toLowerCase());
    if (arr.includes(cleanTarget) || arr.includes("semua_kelas") || arr.includes("all")) {
       return true;
    }
  }
  return false;
};

async function run() {
  const querySnapshot = await getDocs(collection(db, "assignments"));
  const assignmentsList = querySnapshot.docs.map(d => ({id: d.id, ...d.data()}));
  const filtered = assignmentsList.filter(a => isAssignmentForClass(a, "X3"));
  console.log(`Assignments for X3 count: ${filtered.length}`);
  filtered.forEach(f => console.log(`- ${f.title || f.materi} (${f.id})`));
}
run().catch(console.error);
