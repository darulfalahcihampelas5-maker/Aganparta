const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc } = require("firebase/firestore");

const firebaseConfig = {
  projectId: "isometric-density-gd2jw",
  appId: "1:369490798032:web:51c0810c5cc801e6fc05d5",
  apiKey: "AIzaSyD_tW8Opsi6ldKKomNM_e6JzmFGgmFro1I",
  authDomain: "isometric-density-gd2jw.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-sipinterapp-b6b570ca-f030-4ca8-b7cf-c83c6e4299ce");

async function restore() {
  const tugas1Data = {
    id: "TGS-1785884777808",
    title: "Tugas 1",
    materi: "Tugas 1",
    bab: "Informatika dan Keterampilan Generik",
    type: "Tugas",
    description: "Soal Essay Singkat\n1. Jelaskan pengertian informatika menurut pemahamanmu!\n2. Apa yang dimaksud dengan keterampilan generik? Sebutkan minimal tiga contohnya!\n3. Mengapa keterampilan generik sangat penting dimiliki oleh peserta didik di era digital?\n4. Jelaskan pengertian Society 5.0!\n5. Apa tujuan utama diterapkannya konsep Society 5.0 dalam kehidupan masyarakat?\n6. Sebutkan ciri utama Revolusi Industri 1.0, 2.0, 3.0, dan 4.0!\n7. Apa perbedaan antara Revolusi Industri 4.0 dengan Society 5.0?\n8. Berikan dua contoh penerapan teknologi Society 5.0 dalam bidang pendidikan atau kehidupan sehari-hari!\n9. Menurut pendapatmu, keterampilan apa yang harus dimiliki generasi muda agar mampu bersaing pada era Society 5.0? Jelaskan alasannya!\n10. Tuliskan kesimpulanmu mengenai hubungan antara informatika, keterampilan generik, Revolusi Industri, dan Society 5.0!\nTulis dibuku catatan lalu scan dengan cmscaner setelah itu uploud di google drive .klik bagikan ,pastikan posisinya siapa aja yang memiliki link,salin link ,pastekan di link tugas pada aplikasi sipinter. Lalu upload.",
    linkTugas: "https://drive.google.com/file/d/1sOduy1WbuC3a8GDSYFb8iuzZH3jee3Kw/view?usp=drivesdk",
    taskLink: "https://drive.google.com/file/d/1sOduy1WbuC3a8GDSYFb8iuzZH3jee3Kw/view?usp=drivesdk",
    teacherId: "mock-admin",
    startDate: "2026-08-06T00:00:00.000Z",
    publishedAt: "2026-08-06T00:00:00.000Z",
    deadline: "2026-08-11T00:00:00.000Z",
    createdAt: "2026-08-04T23:06:17.809Z",
    updatedAt: new Date().toISOString(),
    kelas: "X1, X2, X3, X4, X5, X6, X7, X8, X9",
    kelasRef: "X1",
    targetClasses: ["X1", "X2", "X3", "X4", "X5", "X6", "X7", "X8", "X9"],
    targets: [
      { kelas: "X1", startDate: "2026-08-06T00:00:00.000Z", publishedAt: "2026-08-06T00:00:00.000Z", deadline: "2026-08-11T00:00:00.000Z" },
      { kelas: "X2", startDate: "2026-08-06T00:00:00.000Z", publishedAt: "2026-08-06T00:00:00.000Z", deadline: "2026-08-11T00:00:00.000Z" },
      { kelas: "X3", startDate: "2026-08-06T00:00:00.000Z", publishedAt: "2026-08-06T00:00:00.000Z", deadline: "2026-08-11T00:00:00.000Z" },
      { kelas: "X4", startDate: "2026-08-06T00:00:00.000Z", publishedAt: "2026-08-06T00:00:00.000Z", deadline: "2026-08-11T00:00:00.000Z" },
      { kelas: "X5", startDate: "2026-08-06T00:00:00.000Z", publishedAt: "2026-08-06T00:00:00.000Z", deadline: "2026-08-11T00:00:00.000Z" },
      { kelas: "X6", startDate: "2026-08-06T00:00:00.000Z", publishedAt: "2026-08-06T00:00:00.000Z", deadline: "2026-08-11T00:00:00.000Z" },
      { kelas: "X7", startDate: "2026-08-06T00:00:00.000Z", publishedAt: "2026-08-06T00:00:00.000Z", deadline: "2026-08-11T00:00:00.000Z" },
      { kelas: "X8", startDate: "2026-08-06T00:00:00.000Z", publishedAt: "2026-08-06T00:00:00.000Z", deadline: "2026-08-11T00:00:00.000Z" },
      { kelas: "X9", startDate: "2026-08-06T00:00:00.000Z", publishedAt: "2026-08-06T00:00:00.000Z", deadline: "2026-08-11T00:00:00.000Z" }
    ]
  };

  console.log("Restoring Tugas 1...");
  await setDoc(doc(db, "assignments", "TGS-1785884777808"), tugas1Data);
  console.log("Successfully restored Tugas 1 (TGS-1785884777808) to assignments collection!");
  
  const snap = await getDoc(doc(db, "assignments", "TGS-1785884777808"));
  console.log("Verified restored doc exists:", snap.exists(), snap.data().title);
  process.exit(0);
}

restore().catch(err => {
  console.error("Error restoring:", err);
  process.exit(1);
});
