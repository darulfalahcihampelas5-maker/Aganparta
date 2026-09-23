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
  const asgSnap = await getDocs(collection(db, "assignments"));
  console.log("Total assignments:", asgSnap.size);
  asgSnap.forEach(d => console.log(d.id, d.data().title || d.data().materi));
  const subSnap = await getDocs(collection(db, "submissions"));
  console.log("Total submissions:", subSnap.size);
  const byAsg = {};
  subSnap.forEach(d => {
    const aid = d.data().assignmentId;
    byAsg[aid] = (byAsg[aid] || 0) + 1;
  });
  console.log("Subs by assignmentId:", byAsg);
}
check();
