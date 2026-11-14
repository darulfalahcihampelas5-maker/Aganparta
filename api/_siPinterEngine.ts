import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// ============================================================================
// SI PINTER 3-LAYER QUOTA-SAVING ENGINE
// Lapis 1: Local Informatics (Bab 1-9) & App Guide Knowledge Base (0 Quota)
// Lapis 2: Cross-Student Shared LRU Cache with Name Personalization (0 Quota)
// Lapis 3: Concurrency Queue + Pacing + Multi-Model Gemini Fallback
// ============================================================================

export function extractFirstName(fullName?: string): string {
  if (!fullName || typeof fullName !== "string" || !fullName.trim()) return "Siswa";
  const firstWord = fullName.trim().split(/\s+/)[0] || "Siswa";
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
}

export function buildCompactSystemInstruction(firstName: string, fullName?: string): string {
  const identityLabel = fullName && fullName !== firstName ? `${firstName} (${fullName})` : firstName;
  return `Anda "Si Pinter", asisten belajar AI resmi **Si-Pinter App** (Informatika Kelas X, SMAN 1 Cililin bersama Pak Agan).
KARAKTER: Profesional, modern, cerdas, sopan santun, rendah hati, jujur. Sapa pengguna dengan nama ${identityLabel}.
GAYA JAWAB: Langsung ke inti, ringkas (maksimal 3-5 kalimat atau poin singkat kecuali diminta rinci), terstruktur rapi, mudah dipahami.

PENGETAHUAN SI-PINTER APP:
1. Dasbor Siswa: Beranda, Tugas Siswa (filter Semua/Selesai/Belum/Ditolak, tombol Lihat Tugas, kirim link Drive/Canva/CamScanner/kamera), Nilai (gabungan rekap nilai & tugas ditolak; lencana merah = ditolak, hijau berkedip = nilai baru masuk), Kehadiran, Materi Ajar, Ujian Online CBT (mode layar penuh & anti pindah tab), Simulasi interaktif, Pesan, Pengguna (foto profil & ganti password), Si Pinter (Chat & Panduan Aplikasi).
2. Panduan Guru Buat Tugas: Manajemen Tugas -> Buat Tugas -> pilih Bab & judul -> pilih kelas target -> atur terbit & deadline -> isi instruksi + Link Berkas Soal (akses publik) -> Simpan & Terbitkan. Nilai melalui Manajemen Nilai -> Audit Pengumpulan.
3. Kunci Tugas Siswa Tidak Ditolak: Ubah izin link Google Drive/Cloud ke "Siapa saja yang memiliki link dapat melihat" (Anyone with the link) sebelum dikirim. Jika ditolak, cek catatan di menu Nilai lalu klik Perbaiki & Kirim Ulang.
4. Materi Informatika Kelas X (9 Bab): Bab 1 Informatika & Keterampilan Generik, Bab 2 Berpikir Komputasional, Bab 3 TIK, Bab 4 Sistem Komputer, Bab 5 Jaringan Komputer & Internet, Bab 6 Analisis Data, Bab 7 Algoritma & Pemrograman, Bab 8 Dampak Sosial Informatika, Bab 9 Praktik Lintas Bidang.

BATASAN KETAT:
- Jawab tuntas hanya pertanyaan seputar aplikasi Si-Pinter App (guru/siswa) dan Informatika Kelas X.
- Jika di luar topik tersebut, tolak dengan sangat sopan dan arahkan kembali ke aplikasi Si-Pinter atau Informatika Kelas X.`;
}

export function normalizeGeminiTurns(
  rawMessages: any[]
): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  const mapped = rawMessages
    .map((m: any) => ({
      role: (m.role === "user" ? "user" : "model") as "user" | "model",
      text: String(m.content || "").trim(),
    }))
    .filter((m) => m.text !== "")
    .slice(-8);

  const normalized: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const item of mapped) {
    if (normalized.length === 0 && item.role !== "user") {
      continue;
    }
    const last = normalized[normalized.length - 1];
    if (last && last.role === item.role) {
      last.parts[0].text += `\n\n${item.text}`;
    } else {
      normalized.push({ role: item.role, parts: [{ text: item.text }] });
    }
  }
  return normalized;
}

export function isRetryableGeminiError(err: any): boolean {
  const status = err?.status || err?.code;
  const msg = String(err?.message || "").toLowerCase();
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout")
  );
}

// ----------------------------------------------------------------------------
// LAPIS 1: LOCAL KNOWLEDGE ENGINE (0 GEMINI QUOTA)
// ----------------------------------------------------------------------------

interface LocalTopicRule {
  id: string;
  // At least one phrase group must match; each group is an array of phrases/keywords
  matchAny: string[][];
  // Optional terms that if present indicate a deeper custom request best handled by AI
  skipIfIncludes?: string[];
  // Minimum matched group count required (default 1)
  maxWordsForExact?: number;
  buildReply: (firstName: string) => string;
}

function normalizeForLocalMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LOCAL_KNOWLEDGE_RULES: LocalTopicRule[] = [
  // 1. Cara Upload Tugas & Izin Google Drive Anti-Ditolak
  {
    id: "upload-tugas-drive",
    matchAny: [
      ["upload", "tugas"],
      ["kirim", "tugas"],
      ["kumpul", "tugas"],
      ["mengumpulkan", "tugas"],
      ["ngirim", "tugas"],
      ["google drive", "ditolak"],
      ["akses", "google drive"],
      ["link", "drive"],
      ["izin", "drive"],
      ["restricted"],
      ["anyone with the link"],
      ["siapa saja yang memiliki link"],
    ],
    skipIfIncludes: ["guru", "pak agan buat", "membuat tugas"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut langkah mengunggah tugas di **Si-Pinter App** agar langsung bisa dinilai dan **tidak ditolak**:\n\n` +
      `1. **Buka Menu Tugas Siswa:** Pilih tugas berstatus *Belum Dikerjakan*, lalu klik **Lihat Tugas** untuk membaca instruksi Pak Agan.\n` +
      `2. **Atur Izin Link Publik (Wajib):** Jika memakai Google Drive, Canva, CamScanner, atau OneDrive, ubah setelan berbagi menjadi **"Siapa saja yang memiliki link dapat melihat"** (*Anyone with the link - Viewer*).\n` +
      `3. **Kirim Tautan / Kamera:** Tempel link lengkap pada kolom pengumpulan (atau gunakan unggah kamera jika tersedia), lalu klik **Kirim**.\n` +
      `4. **Uji Cepat:** Coba buka link tersebut di tab *Incognito* browser; jika tampil tanpa login, berarti sudah aman untuk dinilai.`,
  },

  // 3. Menu Nilai, Notifikasi Merah/Hijau & Tugas Ditolak
  {
    id: "nilai-dan-ditolak",
    matchAny: [
      ["notifikasi", "nilai"],
      ["lencana", "merah"],
      ["merah", "hijau"],
      ["hijau", "berkedip"],
      ["tugas", "ditolak"],
      ["perbaiki", "tugas"],
      ["kirim ulang", "tugas"],
      ["cek", "nilai"],
      ["menu", "nilai"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, sekarang menu **Nilai** menggabungkan informasi hasil penilaian dan tugas yang ditolak:\n\n` +
      `*   **Notifikasi Merah:** Menandakan ada tugas yang **ditolak** dan perlu diperbaiki. Cek catatan revisi dari guru di bagian paling atas menu **Nilai**.\n` +
      `*   **Notifikasi Hijau Berkedip:** Menandakan ada nilai tugas atau hasil Ujian CBT baru yang sudah masuk.\n` +
      `*   **Cara Memperbaiki Tugas Ditolak:** Klik tombol **"Perbaiki & Kirim Ulang Tugas Ini"** di dalam kartu penolakan pada menu **Nilai**, pastikan link sudah publik, lalu kirim kembali.`,
  },

  // 4. Panduan Guru Membuat Tugas & Audit Penilaian
  {
    id: "panduan-guru-tugas",
    matchAny: [
      ["guru", "buat", "tugas"],
      ["cara", "buat", "tugas"],
      ["unggah", "tugas", "guru"],
      ["manajemen tugas"],
      ["audit pengumpulan"],
      ["dasbor guru"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut alur kerja guru di **Si-Pinter App** untuk membuat tugas dan menilai siswa:\n\n` +
      `1. **Buat Tugas:** Buka **Manajemen Tugas** → klik **Buat Tugas** → pilih **Bab** dan judul materi.\n` +
      `2. **Target & Jadwal:** Pilih kelas target, atur waktu terbit serta *deadline* pengumpulan.\n` +
      `3. **Instruksi & Soal:** Isi deskripsi tugas dan tempel **Link Berkas Soal** (pastikan izin aksesnya publik), lalu klik **Simpan & Terbitkan**.\n` +
      `4. **Penilaian:** Buka menu **Nilai** → **Audit Pengumpulan** untuk meninjau berkas jawaban siswa, memberi nilai, atau menolak tugas yang bermasalah beserta catatannya.`,
  },

  // 5. Aturan Ujian Online CBT
  {
    id: "ujian-cbt",
    matchAny: [
      ["ujian", "cbt"],
      ["ujian online"],
      ["aturan", "ujian"],
      ["token", "ujian"],
      ["fullscreen"],
      ["layar penuh", "ujian"],
      ["pindah tab", "ujian"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, perhatikan aturan penting saat mengikuti **Ujian Online (CBT)** di **Si-Pinter App**:\n\n` +
      `1. **Token Ujian:** Buka menu **Ujian Online**, pilih ujian yang aktif untuk kelasmu, dan masukkan **Token** resmi dari Pak Agan.\n` +
      `2. **Mode Layar Penuh (*Fullscreen*):** Ujian wajib berjalan dalam layar penuh. **Jangan berpindah tab**, membuka aplikasi lain, atau keluar dari *fullscreen* agar tidak tercatat sebagai pelanggaran sistem.\n` +
      `3. **Simpan Otomatis:** Jawaban tersimpan secara berkala, jadi tetap tenang dan selesaikan hingga tombol kirim akhir ditekan.`,
  },

  // 6. Menu Aplikasi, Kehadiran, Materi Ajar, Profil & Ganti Password
  {
    id: "fitur-dasbor-siswa",
    matchAny: [
      ["fungsi", "menu", "dasbor"],
      ["menu", "si pinter"],
      ["kehadiran"],
      ["absensi"],
      ["presensi"],
      ["materi ajar"],
      ["simulasi"],
      ["ganti password"],
      ["ubah password"],
      ["foto profil"],
    ],
    skipIfIncludes: ["algoritma", "sorting", "biner"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan menu pendukung di **Dasbor Siswa Si-Pinter App**:\n\n` +
      `*   **Beranda & Sinkron:** Menampilkan ringkasan progres dan kartu akses cepat. Klik **Sinkron** di pojok kanan atas jika pembaruan belum muncul.\n` +
      `*   **Kehadiran:** Memantau rekap *Hadir, Sakit, Izin, Alpa, Dispensasi*, dan persentase kehadiran secara *real-time*.\n` +
      `*   **Materi Ajar & Simulasi:** Pelajari modul per Bab (dapat ditandai *Favorit*, *Sedang Dipelajari*, atau *Selesai*) serta praktik interaktif di menu **Simulasi**.\n` +
      `*   **Pesan & Pengguna:** Menu **Pesan** berisi pengumuman guru, sedangkan menu **Pengguna** digunakan untuk memperbarui tautan foto profil dan mengganti kata sandi.`,
  },

  // 7. Informatika Bab 1: Informatika & Keterampilan Generik
  {
    id: "bab1-informatika",
    matchAny: [
      ["pengertian informatika"],
      ["apa itu informatika"],
      ["bab 1", "informatika"],
      ["keterampilan generik"],
      ["profil pelajar pancasila", "informatika"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut inti **Bab 1: Informatika dan Keterampilan Generik**:\n\n` +
      `*   **Informatika** adalah bidang ilmu mengenai studi, perancangan, dan pembuatan sistem komputasi serta prinsip-prinsip yang menjadi dasarnya (bukan sekadar memakai komputer/HP, melainkan memahami cara kerjanya).\n` +
      `*   **Keterampilan Generik:** Kemampuan kerja sama tim (kolaborasi), pembagian peran yang adil, serta mengomunikasikan ide/karya secara jelas melalui **infografis** dan **presentasi**.\n` +
      `*   Di era Industri 4.0 dan Society 5.0, penguasaan informatika membantu kita menjadi pencipta solusi teknologi, bukan hanya pengguna pasif.`,
  },

  // 8. Informatika Bab 2: Berpikir Komputasional
  {
    id: "bab2-berpikir-komputasional",
    matchAny: [
      ["berpikir komputasional"],
      ["computational thinking"],
      ["bab 2", "informatika"],
      ["dekomposisi", "abstraksi"],
      ["4 pilar", "komputasional"],
      ["empat pilar"],
      ["stack", "queue"],
      ["tumpukan", "antrean"],
    ],
    skipIfIncludes: ["kode", "program", "python", "contoh soal"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan **Bab 2: Berpikir Komputasional** (*Computational Thinking*):\n\n` +
      `Berpikir komputasional adalah cara berpikir sistematis untuk menyelesaikan masalah secara efektif dengan **4 pilar utama**:\n` +
      `1. **Dekomposisi:** Memecah masalah besar menjadi bagian-bagian kecil agar lebih mudah diselesaikan.\n` +
      `2. **Pengenalan Pola:** Mencari kesamaan atau keteraturan dari permasalahan yang ada.\n` +
      `3. **Abstraksi:** Menyaring informasi penting dan mengabaikan detail yang tidak relevan.\n` +
      `4. **Algoritma:** Menyusun langkah-langkah solusi yang terurut, logis, dan jelas.\n\n` +
      `Di Bab 2 juga dipelajari struktur data dasar seperti **Stack** (*LIFO* — masuk terakhir keluar pertama) dan **Queue** (*FIFO* — masuk pertama keluar pertama), serta teknik **Searching** & **Sorting**.`,
  },

  // 9. Informatika Bab 3: TIK & Integrasi Aplikasi Perkantoran
  {
    id: "bab3-tik",
    matchAny: [
      ["bab 3", "tik"],
      ["integrasi aplikasi perkantoran"],
      ["mail merge"],
      ["teknologi informasi dan komunikasi"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan **Bab 3: Teknologi Informasi dan Komunikasi (TIK)**:\n\n` +
      `*   Fokus utamanya adalah **integrasi aplikasi perkantoran** (Pengolah Kata, Pengolah Angka, dan Presentasi) agar pembuatan dokumen lebih cepat dan rapi.\n` +
      `*   **Contoh Penerapan:** Menyisipkan grafik/tabel dari aplikasi Pengolah Angka (Excel/Sheets) ke Pengolah Kata (Word/Docs) atau Presentasi (PowerPoint/Slides), serta menggunakan **Mail Merge** untuk membuat surat/sertifikat massal secara otomatis dari daftar data.\n` +
      `*   Selain itu dipelajari pula pemanfaatan peramban, mesin pencari yang efektif, serta penyimpanan *cloud* yang aman.`,
  },

  // 10. Informatika Bab 4: Perbedaan CPU & GPU / Sistem Komputer
  {
    id: "bab4-cpu-gpu",
    matchAny: [
      ["perbedaan", "cpu", "gpu"],
      ["beda", "cpu", "gpu"],
      ["cpu dan gpu"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, dalam **Bab 4 (Sistem Komputer)** berikut perbedaan utama antara **CPU** dan **GPU**:\n\n` +
      `*   **CPU (*Central Processing Unit*):** Berperan sebagai "otak" utama komputer untuk menjalankan instruksi umum, logika kompleks, dan sistem operasi. Jumlah intinya (*core*) relatif sedikit, tetapi sangat cepat untuk tugas berurutan.\n` +
      `*   **GPU (*Graphics Processing Unit*):** Dirancang khusus untuk memproses ribuan tugas sederhana secara paralel pada waktu bersamaan, sehingga sangat unggul untuk *rendering* grafis, video, game, dan komputasi AI.`,
  },
  {
    id: "bab4-ram-rom",
    matchAny: [
      ["perbedaan", "ram", "rom"],
      ["beda", "ram", "rom"],
      ["ram dan rom"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut perbedaan **RAM** dan **ROM** dalam **Bab 4 (Sistem Komputer)**:\n\n` +
      `*   **RAM (*Random Access Memory*):** Memori sementara berkecepatan tinggi yang menyimpan data aplikasi saat komputer sedang berjalan. Bersifat *volatile* (isinya hilang saat listrik/perangkat dimatikan).\n` +
      `*   **ROM (*Read-Only Memory*):** Memori permanen (*non-volatile*) yang menyimpan instruksi awal saat komputer dinyalakan (seperti BIOS/UEFI) dan datanya tetap tersimpan meski perangkat mati.`,
  },
  {
    id: "bab4-sistem-komputer",
    matchAny: [
      ["sistem komputer"],
      ["bab 4", "informatika"],
      ["hardware", "software", "brainware"],
      ["perangkat keras", "lunak"],
    ],
    skipIfIncludes: ["cpu", "gpu", "ram", "rom", "biner", "heksadesimal", "konversi"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan **Bab 4: Sistem Komputer**:\n\n` +
      `Sistem komputer bekerja melalui interaksi tiga komponen utama:\n` +
      `1. **Hardware (Perangkat Keras):** Komponen fisik seperti alat input (*keyboard, mouse*), pemroses (*CPU, RAM*), penyimpan (*SSD/HDD*), dan output (*monitor, printer*).\n` +
      `2. **Software (Perangkat Lunak):** Program yang mengendalikan perangkat keras, terdiri dari *Sistem Operasi* (Windows, Linux, Android) dan *Aplikasi*.\n` +
      `3. **Brainware:** Pengguna manusia yang mengoperasikan, mengelola, atau mengembangkan sistem komputer.\n\n` +
      `Di bab ini juga dipelajari siklus *Fetch–Decode–Execute* pada CPU serta representasi data digital dalam **bilangan biner** (basis 2).`,
  },

  // 11. Informatika Bab 5: Jaringan Komputer & Internet
  {
    id: "bab5-jaringan",
    matchAny: [
      ["jaringan komputer"],
      ["bab 5", "informatika"],
      ["lan", "man", "wan"],
      ["apa itu internet"],
      ["topologi jaringan"],
      ["ip address"],
    ],
    skipIfIncludes: ["hitung", "subnet", "cidr"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan **Bab 5: Jaringan Komputer dan Internet**:\n\n` +
      `*   **Jenis Jaringan Berdasarkan Jangkauan:** **LAN** (area lokal seperti ruang lab/sekolah), **MAN** (antar gedung dalam satu kota), dan **WAN** (antar kota/negara, contoh terbesarnya adalah **Internet**).\n` +
      `*   **Komponen & Alamat:** Perangkat saling bertukar data menggunakan **IP Address** (alamat unik perangkat), **Router** (pengarah jalur data antar jaringan), **Switch** (penghubung perangkat dalam LAN), dan **DNS** (penerjemah nama domain menjadi IP).\n` +
      `*   **Keamanan Koneksi:** Gunakan **HTTPS** agar pertukaran data terenkripsi dengan aman.`,
  },

  // 12. Informatika Bab 6: Analisis Data
  {
    id: "bab6-analisis-data",
    matchAny: [
      ["analisis data"],
      ["bab 6", "informatika"],
      ["visualisasi data"],
      ["google colab"],
    ],
    skipIfIncludes: ["kode", "error", "script"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan **Bab 6: Analisis Data**:\n\n` +
      `*   **Pengertian:** Proses mengumpulkan, membersihkan, mengolah, dan menafsirkan data agar menjadi informasi yang berguna untuk pengambilan keputusan.\n` +
      `*   **Tahapan Dasar:** Pengumpulan data → pembersihan data (*data cleaning*) → pengolahan/perhitungan statistik → **visualisasi data** (grafik batang, garis, atau lingkaran agar pola mudah dibaca).\n` +
      `*   Di kelas X, praktik dapat dilakukan menggunakan *Spreadsheet* atau pengenalan Python dasar pada **Google Colab**.`,
  },

  // 13. Informatika Bab 7: Algoritma & Pemrograman
  {
    id: "bab7-algoritma",
    matchAny: [
      ["apa itu algoritma"],
      ["flowchart"],
      ["pseudocode"],
      ["bab 7", "informatika"],
      ["algoritma dan pemrograman"],
    ],
    skipIfIncludes: ["buatkan", "kode", "error", "perbaiki", "python", "c++"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan **Bab 7: Algoritma dan Pemrograman**:\n\n` +
      `*   **Algoritma:** Urutan langkah logis yang terbatas dan jelas untuk menyelesaikan suatu masalah.\n` +
      `*   **Cara Penyajian:** Menggunakan bahasa natural, **Flowchart** (diagram alir dengan simbol standar seperti oval, jajar genjang, belah ketupat, persegi panjang), atau **Pseudocode** (kode semu yang mudah dibaca manusia).\n` +
      `*   **Struktur Dasar Program:** *Runtunan* (*sequence*), *Percabangan* (*if–else*), dan *Perulangan* (*for/while loop*), menggunakan variabel serta tipe data (integer, float, string, boolean).`,
  },

  // 14. Informatika Bab 8: Dampak Sosial Informatika
  {
    id: "bab8-dampak-sosial",
    matchAny: [
      ["dampak sosial informatika"],
      ["bab 8", "informatika"],
      ["etika digital"],
      ["jejak digital"],
      ["cyberbullying"],
      ["hak kekayaan intelektual"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan **Bab 8: Dampak Sosial Informatika**:\n\n` +
      `*   **Dampak Positif & Tantangan:** Teknologi mempercepat komunikasi, akses belajar, dan ekonomi digital, namun juga memunculkan tantangan seperti *hoaks*, kecanduan gawai, pencurian data, dan *cyberbullying*.\n` +
      `*   **Etika & Keamanan Digital:** Jaga privasi data pribadi, pahami **jejak digital** (segala aktivitas daring dapat tersimpan permanen), serta patuhi **HAKI / Hak Cipta** dan aturan hukum siber (UU ITE) dengan selalu mengutip sumber karya orang lain secara jujur.`,
  },

  // 15. Informatika Bab 9: Praktik Lintas Bidang
  {
    id: "bab9-plb",
    matchAny: [
      ["praktik lintas bidang"],
      ["bab 9", "informatika"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan **Bab 9: Praktik Lintas Bidang (PLB)**:\n\n` +
      `*   **Tujuan:** Menggabungkan pengetahuan informatika (berpikir komputasional, analisis data, pemrograman, TIK) dengan bidang ilmu lain (IPA, IPS, seni, atau lingkungan sekolah) untuk menghasilkan **proyek solusi nyata**.\n` +
      `*   **Siklus Proyek:** Identifikasi masalah di sekitar → perancangan solusi & pembagian peran tim → pembuatan/pengujian prototipe → dokumentasi dan presentasi hasil karya secara kolaboratif.`,
  },

  // 15. Sapaan & Identitas Si Pinter (fallback lokal paling akhir jika tidak ada topik spesifik)
  {
    id: "greeting-identity",
    maxWordsForExact: 7,
    matchAny: [
      ["halo"],
      ["hai"],
      ["assalamualaikum"],
      ["selamat pagi"],
      ["selamat siang"],
      ["selamat sore"],
      ["selamat malam"],
      ["siapa kamu"],
      ["kamu siapa"],
      ["perkenalkan"],
      ["terima kasih"],
      ["makasih"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**! Saya **Si Pinter**, asisten belajar resmi **Si-Pinter App** untuk mata pelajaran Informatika Kelas X bersama Pak Agan di SMAN 1 Cililin.\n\nDengan senang hati saya siap membantu **${firstName}** memahami fitur aplikasi (cara upload tugas, cek nilai, aturan CBT) maupun materi **Informatika Bab 1–9**. Silakan tulis pertanyaanmu ya!`,
  },
];

export function matchLocalKnowledge(questionText: string, firstName: string): string | null {
  const normalized = normalizeForLocalMatch(questionText);
  if (!normalized) return null;
  const wordCount = normalized.split(" ").length;

  for (const rule of LOCAL_KNOWLEDGE_RULES) {
    if (rule.maxWordsForExact && wordCount > rule.maxWordsForExact) {
      continue;
    }
    if (rule.skipIfIncludes && rule.skipIfIncludes.some((skip) => normalized.includes(skip))) {
      continue;
    }

    const matched = rule.matchAny.some((group) =>
      group.every((keyword) => {
        if (keyword.includes(" ")) {
          return normalized.includes(keyword);
        }
        // Match whole word or clean boundary for single tokens
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(normalized);
      })
    );

    if (matched) {
      return rule.buildReply(firstName);
    }
  }

  return null;
}

// ----------------------------------------------------------------------------
// LAPIS 2: CROSS-STUDENT SHARED CACHE (0 GEMINI QUOTA FOR REPEATED QUESTIONS)
// ----------------------------------------------------------------------------

const CHAT_CACHE_MAX = 1000;
const CHAT_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours (full school day)
const sharedChatCache = new Map<string, { template: string; expiresAt: number }>();

const NAME_TOKEN = "{{SI_PINTER_STUDENT}}";

export function normalizeSharedQuestionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s?!]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function templatizeResponse(text: string, firstName: string, fullName?: string): string {
  let result = text;
  const candidates = [fullName?.trim(), firstName?.trim()]
    .filter((n): n is string => Boolean(n && n.length >= 2 && n.toLowerCase() !== "siswa"))
    .sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    const regex = new RegExp(`\\b${escapeRegex(candidate)}\\b`, "gi");
    result = result.replace(regex, NAME_TOKEN);
  }
  return result;
}

function personalizeTemplate(template: string, firstName: string): string {
  return template.split(NAME_TOKEN).join(firstName);
}

export function getSharedCachedReply(question: string, firstName: string): string | null {
  const key = normalizeSharedQuestionKey(question);
  if (!key) return null;
  const entry = sharedChatCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sharedChatCache.delete(key);
    return null;
  }
  // Refresh LRU recency
  sharedChatCache.delete(key);
  sharedChatCache.set(key, entry);
  return personalizeTemplate(entry.template, firstName);
}

export function setSharedCachedReply(question: string, text: string, firstName: string, fullName?: string) {
  if (!text.trim() || text.length > 5000) return;
  const key = normalizeSharedQuestionKey(question);
  if (!key) return;
  if (sharedChatCache.size >= CHAT_CACHE_MAX) {
    const oldestKey = sharedChatCache.keys().next().value;
    if (oldestKey !== undefined) sharedChatCache.delete(oldestKey);
  }
  sharedChatCache.set(key, {
    template: templatizeResponse(text, firstName, fullName),
    expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
  });
}

// ----------------------------------------------------------------------------
// LAPIS 3: CONCURRENCY QUEUE + PACING + MULTI-MODEL GEMINI EXECUTION
// ----------------------------------------------------------------------------

const MAX_CONCURRENT_GEMINI = 3;
const MAX_QUEUED_REQUESTS = 45;
const MIN_DISPATCH_GAP_MS = 220;

interface QueueEntry {
  cancelled: boolean;
  start: () => void;
}

let activeGeminiRequests = 0;
let lastDispatchAt = 0;
const pendingQueue: QueueEntry[] = [];
let dispatchTimer: ReturnType<typeof setTimeout> | null = null;

function pumpQueue() {
  if (dispatchTimer) return;

  while (pendingQueue.length > 0 && pendingQueue[0].cancelled) {
    pendingQueue.shift();
  }

  if (pendingQueue.length === 0 || activeGeminiRequests >= MAX_CONCURRENT_GEMINI) {
    return;
  }

  const now = Date.now();
  const waitMs = Math.max(0, lastDispatchAt + MIN_DISPATCH_GAP_MS - now);
  if (waitMs > 0) {
    dispatchTimer = setTimeout(() => {
      dispatchTimer = null;
      pumpQueue();
    }, waitMs);
    return;
  }

  const next = pendingQueue.shift();
  if (!next || next.cancelled) {
    pumpQueue();
    return;
  }

  activeGeminiRequests += 1;
  lastDispatchAt = Date.now();
  next.start();
}

export class QueueFullError extends Error {
  constructor() {
    super("Antrean Si Pinter sedang sangat padat karena banyak siswa bertanya bersamaan. Silakan tunggu beberapa detik lalu coba kirim ulang ya.");
    this.name = "QueueFullError";
  }
}

export async function runWithGeminiQueue<T>(
  task: () => Promise<T>,
  isCancelled?: () => boolean
): Promise<T> {
  if (pendingQueue.length >= MAX_QUEUED_REQUESTS) {
    throw new QueueFullError();
  }

  const entry: QueueEntry = {
    cancelled: Boolean(isCancelled?.()),
    start: () => {},
  };

  await new Promise<void>((resolve, reject) => {
    if (isCancelled?.()) {
      entry.cancelled = true;
      reject(new Error("Client disconnected before queue turn."));
      return;
    }
    entry.start = () => resolve();
    pendingQueue.push(entry);
    pumpQueue();
  });

  try {
    return await task();
  } finally {
    activeGeminiRequests = Math.max(0, activeGeminiRequests - 1);
    pumpQueue();
  }
}

export function getGeminiModelConfigs(systemInstruction: string) {
  return [
    {
      model: "gemini-3.1-flash-lite",
      firstTokenTimeoutMs: 12000,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    },
    {
      model: "gemini-4-hydrogen",
      firstTokenTimeoutMs: 15000,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    },
  ];
}

export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export function isQuotaExhaustedGeminiError(err: any): boolean {
  const status = err?.status || err?.code;
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("daily limit") ||
    msg.includes("too many requests") ||
    msg.includes("exceeded") ||
    msg.includes("limit kuota")
  );
}

export function formatFriendlyGeminiError(
  lastError: any,
  assistantName = "Si Pinter",
  firstName = "temen"
): string {
  const friendName = firstName && firstName.trim() ? firstName.trim() : "temen";
  if (lastError instanceof QueueFullError) {
    return `Eh ${friendName}, bentar ya—soalnya sekarang lagi banyak banget temen-temen yang nanya barengan nih 😅 Tunggu beberapa detik terus kirim ulang lagi ya!`;
  }
  const errText = String(lastError?.message || "");
  if (
    errText.includes("403") ||
    errText.includes("PERMISSION_DENIED") ||
    errText.includes("API_KEY_INVALID")
  ) {
    return (
      `Eh ${friendName}, kayaknya akses AI aku di server lagi ada kendala teknis sebentar nih 🙏 Nanti kabarin Pak Agan ya biar dicek.\n\n` +
      `Tapi tenang aja, kalau kamu mau tanya soal **cara kirim tugas, aturan CBT, atau rangkuman materi Informatika Bab 1–9**, langsung tanya aja atau buka tab **Panduan Aplikasi** di atas—itu masih bisa langsung aku jawab kok!`
    );
  }
  if (isQuotaExhaustedGeminiError(lastError)) {
    return (
      `Eh ${friendName}, jujur nih jatah gratisan AI aku buat hari ini kebetulan lagi habis kepake bareng temen-temen yang lain 😅\n\n` +
      `Jadi buat pertanyaan bebas yang perlu mikir panjang, aku istirahat dulu sebentar sampai kuotanya ke-reset lagi ya. Tapi santai aja, kamu masih bisa buka tab **Panduan Aplikasi** di atas atau tanya seputar **cara upload tugas, info nilai/CBT, sama rangkuman materi Informatika Bab 1–9**—itu masih aman dan langsung aku bantu kok! 😊`
    );
  }
  return (
    `Aduh ${friendName}, maaf banget ya koneksinya ke otak AI ${assistantName} lagi agak tersendat sebentar nih 😅 Coba kirim ulang pertanyaannya beberapa saat lagi ya.\n\n` +
    `Sambil nunggu, pertanyaan dasar soal fitur aplikasi atau ringkasan materi Informatika Bab 1–9 tetap bisa langsung aku jawab kok!`
  );
}

export async function streamTextViaSse(res: any, text: string, debugMeta?: Record<string, any>) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(`data: ${JSON.stringify({ text })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true, ...(debugMeta || {}) })}\n\n`);
  return res.end();
}

export const PROFANITY_LIST = [
  "anjing", "babi", "monyet", "bangsat", "kampang", "kontol", "memek", "anjir", "anjg", "anj",
  "pler", "puki", "jembut", "tolol", "goblok", "bego", "setan", "iblis", "keparat",
  "tai", "taik", "pantek", "asu", "asw", "tod", "pepek", "ngentot", "meki", "lonte", "banci",
  "bajingan", "sinting", "perek", "bejad", "colok", "coli", "itil", "ngewe", "anjrit", "anjrot"
];

export function checkProfanity(text: string): string | null {
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,.\-!?]+/);
  for (const word of words) {
    if (PROFANITY_LIST.includes(word)) {
      return word;
    }
  }
  for (const p of PROFANITY_LIST) {
    if (p.length >= 3 && lower.includes(p)) {
      return p;
    }
  }
  return null;
}

export function getProfanityWarningMessage(firstName: string, flaggedWord: string): string {
  return `⚠️ **Peringatan Etika Digital — ${firstName}**\n\n` +
    `Mohon maaf, kalimat atau kata yang Anda kirimkan (*terdeteksi kata: "${flaggedWord}"*) mengandung unsur bahasa kasar, kotor, atau tidak sopan.\n\n` +
    `Si Pinter mengingatkan bahwa seluruh teks percakapan, identitas akun, kelas, dan waktu pengiriman Anda telah **tersimpan otomatis di database server**. Catatan pelanggaran etika digital ini **akan diteruskan secara resmi kepada Pak Agan (Guru Pengampu) serta pihak Kesiswaan SMAN 1 Cililin** untuk ditindaklanjuti sebagai bentuk pelanggaran tata tertib sekolah.\n\n` +
    `Mari junjung tinggi kesopanan, etika bermedia digital, dan saling menghormati dalam ruang belajar bersama ini ya!`;
}

