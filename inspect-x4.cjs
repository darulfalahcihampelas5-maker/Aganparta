const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  projectId: "isometric-density-gd2jw",
  appId: "1:369490798032:web:51c0810c5cc801e6fc05d5",
  apiKey: "AIzaSyD_tW8Opsi6ldKKomNM_e6JzmFGgmFro1I",
  authDomain: "isometric-density-gd2jw.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-sipinterapp-b6b570ca-f030-4ca8-b7cf-c83c6e4299ce");

async function check() {
  console.log("=== EXAMS ===");
  const examSnap = await getDocs(collection(db, "exams"));
  examSnap.forEach(d => {
    const data = d.data();
    console.log(d.id, "=>", {
      title: data.title || data.materi,
      materi: data.materi,
      bab: data.bab,
      type: data.type,
      kelas: data.kelas,
      kelasRef: data.kelasRef,
      targetClasses: data.targetClasses,
      targets: data.targets,
      createdAt: data.createdAt
    });
  });

  console.log("\n=== ASSIGNMENTS ===");
  const asgSnap = await getDocs(collection(db, "assignments"));
  asgSnap.forEach(d => {
    const data = d.data();
    console.log(d.id, "=>", {
      title: data.title || data.materi,
      materi: data.materi,
      bab: data.bab,
      type: data.type,
      kelas: data.kelas,
      kelasRef: data.kelasRef,
      targetClasses: data.targetClasses,
      targets: data.targets,
      createdAt: data.createdAt
    });
  });

  console.log("\n=== FINAL_GRADES (sample containing X4 or recent) ===");
  const fgSnap = await getDocs(collection(db, "final_grades"));
  console.log("Total final_grades:", fgSnap.size);
  const byAsg = {};
  fgSnap.forEach(d => {
    const data = d.data();
    const asgId = data.assignmentId || d.id.split("_")[0];
    byAsg[asgId] = (byAsg[asgId] || 0) + 1;
    if (data.kelas === "X4" || data.kelasRef === "X4") {
      // console.log("X4 grade:", d.id, data);
    }
  });
  console.log("final_grades count by assignmentId/examId:", byAsg);

  process.exit(0);
}
check();
