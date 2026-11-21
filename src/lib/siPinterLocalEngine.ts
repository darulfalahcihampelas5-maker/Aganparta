export interface SipinterStudentContext {
  kelas?: string;
  todayDateLabel?: string;
  todayMessages?: Array<{
    source: string;
    title: string;
    content: string;
    timeLabel?: string;
  }>;
  recentAnnouncements?: Array<{
    title: string;
    content: string;
    dateLabel: string;
  }>;
  pendingAssignments?: Array<{
    title: string;
    bab: string;
    deadlineLabel: string;
    isOverdue?: boolean;
  }>;
  rejectedAssignments?: Array<{
    title: string;
    feedback: string;
  }>;
  waitingReviewCount?: number;
  completedTasksCount?: number;
  activeExams?: Array<{
    title: string;
    bab: string;
    durationMinutes: number;
    isFinished: boolean;
  }>;
  materials?: Array<{
    title: string;
    bab: string;
    progressStatus: string;
  }>;
  attendanceSummary?: {
    percentage: string;
    totalMeetings: number;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    dispen: number;
    rubricStatus: string;
  } | null;
  gradesSummary?: {
    gradedCount: number;
    avgTugas: number;
    avgUjian: number;
  };
  reportCard?: {
    finalScore: number;
    predikat: string;
    kkm: number;
    nilaiKehadiran: number;
    avgTugas: number;
    nilaiUts: number;
    nilaiUas: number;
    rubric: {
      kehadiran: number;
      tugas: number;
      uts: number;
      uas: number;
    };
  };
  classRanking?: {
    rank: number | string;
    total: number | string;
    topStudents: Array<{
      rank: number;
      name: string;
      score: number;
    }>;
  };
  integritySummary?: {
    statusText: string;
    violationCount: number;
  };
  kisiKisiList?: Array<{
    title: string;
    category: string;
    bab: string;
    hasDriveLink: boolean;
  }>;
  isSimulasiEnabled?: boolean;
}

const PROFANITY_LIST = [
  "anjing", "babi", "monyet", "bangsat", "kampang", "kontol", "memek", "anjir", "anjg", "anj",
  "pler", "puki", "jembut", "tolol", "goblok", "bego", "setan", "iblis", "keparat",
  "tai", "taik", "pantek", "asu", "asw", "tod", "pepek", "ngentot", "meki", "lonte", "banci",
  "bajingan", "sinting", "perek", "bejad", "colok", "coli", "itil", "ngewe", "anjrit", "anjrot"
];

export function checkClientProfanity(text: string): string | null {
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,.\-!?]+/);
  for (const word of words) {
    if (PROFANITY_LIST.includes(word)) return word;
  }
  for (const p of PROFANITY_LIST) {
    if (p.length >= 3 && lower.includes(p)) return p;
  }
  return null;
}

export function buildProfanityWarningMessage(firstName: string, flaggedWord: string): string {
  return (
    `⚠️ **Peringatan Etika Digital — ${firstName}**\n\n` +
    `Mohon maaf, kalimat yang dikirimkan (*terdeteksi kata: "${flaggedWord}"*) mengandung unsur bahasa tidak sopan.\n\n` +
    `Si Pinter mengingatkan bahwa seluruh teks percakapan, identitas akun, dan waktu pengiriman tercatat otomatis di server untuk menjaga tata tertib belajar bersama Pak Agan di SMAN 1 Cililin.\n\n` +
    `Mari gunakan bahasa yang sopan dan santun saat belajar ya!`
  );
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isConfidentialRequest(normalized: string): string | null {
  if (
    (normalized.includes("token") && !normalized.includes("aturan") && !normalized.includes("cara")) ||
    normalized.includes("minta token") ||
    normalized.includes("kode token") ||
    normalized.includes("bocoran token")
  ) {
    return "token ujian";
  }
  if (
    normalized.includes("kunci jawaban") ||
    normalized.includes("bocoran soal") ||
    normalized.includes("jawaban ujian") ||
    normalized.includes("jawaban cbt")
  ) {
    return "soal dan kunci jawaban ujian";
  }
  if (
    normalized.includes("password siswa") ||
    normalized.includes("password guru") ||
    normalized.includes("password akun") ||
    normalized.includes("sandi teman") ||
    normalized.includes("nilai teman") ||
    normalized.includes("nilai siswa lain")
  ) {
    return "data rahasia akun atau nilai siswa lain";
  }
  return null;
}

interface LocalTopicRule {
  id: string;
  matchAny: string[][];
  skipIfIncludes?: string[];
  maxWordsForExact?: number;
  buildReply: (firstName: string) => string;
}

const LOCAL_TOPICS: LocalTopicRule[] = [
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
  {
    id: "ujian-cbt",
    matchAny: [
      ["aturan", "ujian"],
      ["aturan", "cbt"],
      ["ujian", "cbt", "aman"],
      ["cara", "ujian", "cbt"],
      ["fullscreen"],
      ["layar penuh", "ujian"],
      ["pindah tab", "ujian"],
      ["pelanggaran", "ujian"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, perhatikan aturan penting saat mengikuti **Ujian Online (CBT)** di **Si-Pinter App**:\n\n` +
      `1. **Token Ujian:** Buka menu **Ujian Online**, pilih ujian yang aktif untuk kelasmu, dan masukkan **Token** resmi dari Pak Agan.\n` +
      `2. **Mode Layar Penuh (*Fullscreen*):** Ujian wajib berjalan dalam layar penuh. **Jangan berpindah tab**, membuka aplikasi lain, atau keluar dari *fullscreen* agar tidak tercatat sebagai pelanggaran sistem.\n` +
      `3. **Simpan Otomatis:** Jawaban tersimpan secara berkala, jadi tetap tenang dan selesaikan hingga tombol kirim akhir ditekan.`,
  },
  {
    id: "menu-nilai-panduan",
    matchAny: [
      ["notifikasi", "nilai"],
      ["lencana", "merah"],
      ["merah", "hijau"],
      ["hijau", "berkedip"],
      ["perbedaan", "merah", "hijau"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, di menu **Nilai** terdapat dua penanda penting:\n\n` +
      `* **Lencana Merah:** Ada tugas yang **ditolak** dan perlu revisi. Cek catatan guru di bagian atas menu **Nilai**, lalu klik **Perbaiki & Kirim Ulang Tugas Ini**.\n` +
      `* **Lencana Hijau Berkedip:** Ada nilai tugas atau hasil Ujian CBT baru yang sudah masuk.`,
  },
  {
    id: "fitur-dasbor-siswa",
    matchAny: [
      ["fungsi", "menu", "dasbor"],
      ["menu", "si pinter"],
      ["ganti password"],
      ["ubah password"],
      ["foto profil"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan menu di **Dasbor Siswa Si-Pinter App**:\n\n` +
      `* **Beranda & Sinkron:** Ringkasan progres belajar & tombol **Sinkron** di pojok kanan atas untuk menyegarkan data terbaru.\n` +
      `* **Tugas Siswa & Nilai:** Kerjakan/kirim link tugas, pantau status, dan perbaiki tugas ditolak lewat menu **Nilai**.\n` +
      `* **Kehadiran, Materi Ajar, Ujian Online & Simulasi:** Pantau absensi, baca modul Bab 1–9, kerjakan CBT, dan jalankan simulasi jika diaktifkan guru.\n` +
      `* **Pesan & Pengguna:** Cek pengumuman Pak Agan di **Pesan**, atau ubah foto profil & sandi di **Pengguna**.`,
  },
  {
    id: "bab1-informatika",
    matchAny: [
      ["pengertian informatika"],
      ["apa itu informatika"],
      ["bab 1", "informatika"],
      ["keterampilan generik"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut inti **Bab 1: Informatika dan Keterampilan Generik**:\n\n` +
      `* **Informatika** mempelajari perancangan dan cara kerja sistem komputasi, bukan sekadar memakai gawai.\n` +
      `* **Keterampilan Generik:** Kerja sama tim, pembagian peran, dan penyajian karya melalui infografis maupun presentasi.`,
  },
  {
    id: "bab2-berpikir-komputasional",
    matchAny: [
      ["berpikir komputasional"],
      ["computational thinking"],
      ["bab 2", "informatika"],
      ["dekomposisi", "abstraksi"],
      ["4 pilar"],
      ["empat pilar"],
    ],
    skipIfIncludes: ["kode", "program", "python", "contoh soal"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut ringkasan **Bab 2: Berpikir Komputasional** (*Computational Thinking*):\n\n` +
      `1. **Dekomposisi:** Memecah masalah besar menjadi bagian-bagian kecil.\n` +
      `2. **Pengenalan Pola:** Menemukan kesamaan/keteraturan dari masalah.\n` +
      `3. **Abstraksi:** Fokus pada inti penting dan mengabaikan detail yang tidak relevan.\n` +
      `4. **Algoritma:** Menyusun langkah solusi yang runtut dan logis.\n\n` +
      `Juga dipelajari struktur data **Stack** (*LIFO*) dan **Queue** (*FIFO*), serta teknik *Searching* & *Sorting*.`,
  },
  {
    id: "bab3-tik",
    matchAny: [["bab 3", "tik"], ["integrasi aplikasi perkantoran"], ["mail merge"]],
    buildReply: (firstName) =>
      `Halo **${firstName}**, inti **Bab 3: TIK** adalah **integrasi aplikasi perkantoran** (Pengolah Kata, Pengolah Angka, Presentasi), seperti menyisipkan grafik Spreadsheet ke dokumen/slide serta memakai **Mail Merge** untuk surat massal otomatis.`,
  },
  {
    id: "bab4-sistem-komputer",
    matchAny: [
      ["sistem komputer"],
      ["bab 4", "informatika"],
      ["perbedaan", "cpu", "gpu"],
      ["perbedaan", "ram", "rom"],
    ],
    skipIfIncludes: ["konversi", "hitung"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, berikut inti **Bab 4: Sistem Komputer**:\n\n` +
      `* **Komponen Utama:** *Hardware* (input, proses, simpan, output), *Software* (OS & aplikasi), dan *Brainware* (pengguna).\n` +
      `* **CPU vs GPU:** CPU menangani instruksi umum secara berurutan; GPU unggul memproses ribuan tugas grafis/AI secara paralel.\n` +
      `* **RAM vs ROM:** RAM menyimpan data sementara (*volatile*); ROM menyimpan instruksi permanen saat komputer dinyalakan.`,
  },
  {
    id: "bab5-jaringan",
    matchAny: [["jaringan komputer"], ["bab 5", "informatika"], ["lan", "man", "wan"], ["ip address"]],
    skipIfIncludes: ["subnet", "hitung", "cidr"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, inti **Bab 5: Jaringan Komputer & Internet**:\n\n` +
      `* **Jangkauan:** **LAN** (lokal/lab), **MAN** (antar gedung/kota), **WAN** (luas/Internet).\n` +
      `* **Perangkat & Alamat:** **IP Address** (alamat perangkat), **Switch** (penghubung dalam LAN), **Router** (pengarah jalur antar jaringan), dan **DNS** (penerjemah domain ke IP).`,
  },
  {
    id: "bab6-analisis-data",
    matchAny: [["analisis data"], ["bab 6", "informatika"], ["visualisasi data"]],
    skipIfIncludes: ["kode", "error", "script"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, inti **Bab 6: Analisis Data** meliputi pengumpulan data, pembersihan data (*data cleaning*), pengolahan statistik dasar, dan **visualisasi data** (grafik batang/garis/lingkaran) memakai Spreadsheet atau Google Colab.`,
  },
  {
    id: "bab7-algoritma",
    matchAny: [["apa itu algoritma"], ["flowchart"], ["pseudocode"], ["bab 7", "informatika"]],
    skipIfIncludes: ["buatkan", "kode", "error", "python", "c++"],
    buildReply: (firstName) =>
      `Halo **${firstName}**, inti **Bab 7: Algoritma & Pemrograman** mencakup urutan langkah logis menggunakan **Flowchart** atau **Pseudocode**, serta 3 struktur dasar program: **Runtunan** (*sequence*), **Percabangan** (*if–else*), dan **Perulangan** (*loop*).`,
  },
  {
    id: "bab8-dampak-sosial",
    matchAny: [["dampak sosial informatika"], ["bab 8", "informatika"], ["jejak digital"], ["etika digital"]],
    buildReply: (firstName) =>
      `Halo **${firstName}**, inti **Bab 8: Dampak Sosial Informatika** menekankan kewaspadaan terhadap *hoaks* dan *cyberbullying*, pengelolaan **jejak digital**, serta menghormati **HAKI / Hak Cipta** dan UU ITE.`,
  },
  {
    id: "bab9-plb",
    matchAny: [["praktik lintas bidang"], ["bab 9", "informatika"]],
    buildReply: (firstName) =>
      `Halo **${firstName}**, **Bab 9: Praktik Lintas Bidang (PLB)** menggabungkan informatika dengan mata pelajaran lain untuk merancang proyek solusi nyata secara kolaboratif dari identifikasi masalah hingga presentasi hasil.`,
  },
  {
    id: "greeting-identity",
    maxWordsForExact: 6,
    matchAny: [
      ["halo"], ["hai"], ["assalamualaikum"], ["selamat pagi"],
      ["selamat siang"], ["selamat sore"], ["selamat malam"],
      ["siapa kamu"], ["kamu siapa"], ["terima kasih"], ["makasih"],
    ],
    buildReply: (firstName) =>
      `Halo **${firstName}**! Saya **Si Pinter**, asisten belajar yang terhubung langsung dengan data non-rahasia **Si-Pinter App** dan **Gemini AI** (memakai kuota akun Google milikmu sendiri).\n\nSilakan pilih **pertanyaan cepat** di bawah untuk cek pesan hari ini, tugas, nilai, atau klik **Buka Gemini AI** untuk berdiskusi bebas!`,
  },
];

function answerLiveSipinterData(
  normalized: string,
  firstName: string,
  ctx?: SipinterStudentContext
): string | null {
  if (!ctx) return null;

  const todayLabel = ctx.todayDateLabel || "hari ini";
  const kelasLabel = ctx.kelas ? ` (Kelas **${ctx.kelas}**)` : "";

  // 1. Pesan / Pengumuman Hari Ini
  if (
    normalized.includes("pesan hari ini") ||
    normalized.includes("ada pesan") ||
    normalized.includes("cek pesan") ||
    normalized.includes("pengumuman") ||
    normalized.includes("notifikasi")
  ) {
    const todayMsgs = ctx.todayMessages || [];
    const recentAnns = ctx.recentAnnouncements || [];

    if (todayMsgs.length > 0) {
      const itemsText = todayMsgs
        .map((m, idx) => {
          const timePart = m.timeLabel ? ` · ${m.timeLabel}` : "";
          return `${idx + 1}. **[${m.source}] ${m.title}**${timePart}\n   ${m.content}`;
        })
        .join("\n");

      return (
        `Halo **${firstName}**${kelasLabel}, ada **${todayMsgs.length} pesan/info hari ini** (${todayLabel}):\n\n` +
        `${itemsText}\n\n` +
        `Kamu juga bisa membuka menu **Pesan** di bilah navigasi bawah untuk melihat detail lengkapnya.`
      );
    }

    if (recentAnns.length > 0) {
      const recentText = recentAnns
        .slice(0, 2)
        .map((a, idx) => `${idx + 1}. **${a.title}** (${a.dateLabel})\n   ${a.content}`)
        .join("\n");

      return (
        `Halo **${firstName}**${kelasLabel}, untuk hari ini (**${todayLabel}**) belum ada pesan atau pengumuman baru dari Pak Agan.\n\n` +
        `Sebagai pengingat, berikut **pengumuman terakhir** untuk kelasmu:\n${recentText}`
      );
    }

    return (
      `Halo **${firstName}**${kelasLabel}, untuk hari ini (**${todayLabel}**) belum ada pesan atau pengumuman baru di menu **Pesan**.`
    );
  }

  // 2. Siswa dengan Nilai Rapor Tertinggi di Kelas (Top Student)
  if (
    (normalized.includes("tertinggi") ||
      normalized.includes("paling tinggi") ||
      normalized.includes("juara") ||
      normalized.includes("peringkat 1") ||
      normalized.includes("rank 1") ||
      normalized.includes("ranking 1")) &&
    (normalized.includes("rapor") || normalized.includes("nilai") || normalized.includes("kelas") || normalized.includes("siswa"))
  ) {
    const cr = ctx.classRanking;
    const top = cr?.topStudents || [];
    if (top.length === 0) {
      return `Halo **${firstName}**${kelasLabel}, data peringkat kelas saat ini belum tersedia. Pastikan sinkronisasi data sudah selesai ya.`;
    }

    const leader = top[0];
    const topListLines = top
      .map((item) => `${item.rank}. **${item.name}** — Skor Rapor Sementara: **${item.score}**`)
      .join("\n");

    const selfRankNote =
      cr && cr.rank !== "-"
        ? `\n\nPosisi kamu saat ini berada di **Peringkat ${cr.rank} dari ${cr.total} siswa** sekelas. Terus semangat belajar dan lengkapi semua tugas untuk mengejar posisi puncak!`
        : "";

    return (
      `Halo **${firstName}**${kelasLabel}, siswa dengan estimasi nilai rapor paling tinggi di kelasmu saat ini adalah **${leader.name}** (Skor: **${leader.score}**).\n\n` +
      `**3 Besar Nilai Rapor Sementara Kelas ${ctx.kelas || ""}:**\n` +
      `${topListLines}` +
      `${selfRankNote}`
    );
  }

  // 3. Nilai Rapor Sementara & Rincian Rubrik
  if (
    normalized.includes("rapor") ||
    normalized.includes("nilai akhir") ||
    normalized.includes("predikat") ||
    normalized.includes("kkm")
  ) {
    const rc = ctx.reportCard;
    if (!rc) {
      return `Halo **${firstName}**${kelasLabel}, estimasi nilai rapor sementara belum tersedia saat ini. Kamu dapat mengecek rinciannya langsung di menu **Nilai**.`;
    }

    const isTuntas = rc.finalScore >= rc.kkm;
    const statusKkmText = isTuntas
      ? `**Tuntas KKM (${rc.kkm})**`
      : `**Belum Mencapai KKM (${rc.kkm})** — perlu tambah **${rc.kkm - rc.finalScore} poin**`;

    const rankText =
      ctx.classRanking && ctx.classRanking.rank !== "-"
        ? ` · Peringkat **${ctx.classRanking.rank} / ${ctx.classRanking.total}**`
        : "";

    return (
      `Halo **${firstName}**${kelasLabel}, berikut **Estimasi Nilai Rapor Sementara** milikmu (dihitung *real-time* dari rubrik guru):\n\n` +
      `* **Skor Akhir Rapor:** **${rc.finalScore}** (Predikat **${rc.predikat}**${rankText})\n` +
      `* **Status Ketuntasan:** ${statusKkmText}\n\n` +
      `**Rincian 4 Komponen Penilaian:**\n` +
      `1. **Kehadiran (${rc.rubric.kehadiran}%):** **${rc.nilaiKehadiran}**\n` +
      `2. **Tugas & Ujian Harian (${rc.rubric.tugas}%):** **${rc.avgTugas}**\n` +
      `3. **PTS / UTS (${rc.rubric.uts}%):** **${rc.nilaiUts}**\n` +
      `4. **PAS / SAS / UAS (${rc.rubric.uas}%):** **${rc.nilaiUas}**\n\n` +
      `*Catatan: Nilai ini bersifat estimasi sementara selama semester berjalan. Kamu dapat mengunduh PDF rapornya di menu **Nilai → Unduh Rapor PDF**.*`
    );
  }

  // 4. Analisis Komponen Nilai yang Perlu Ditingkatkan
  if (
    normalized.includes("ditingkatkan") ||
    normalized.includes("tingkatkan") ||
    normalized.includes("perbaiki nilai") ||
    normalized.includes("naikkan nilai") ||
    normalized.includes("komponen nilai") ||
    normalized.includes("masih kurang")
  ) {
    const rc = ctx.reportCard;
    if (!rc) {
      return `Halo **${firstName}**${kelasLabel}, data komponen rapor belum tersedia. Cek menu **Nilai** untuk melihat rincian nilaimu.`;
    }

    const components = [
      { label: "Kehadiran", score: rc.nilaiKehadiran, weight: rc.rubric.kehadiran, tip: "Jaga presensi agar tidak ada Alpa." },
      {
        label: "Tugas & Ujian Harian",
        score: rc.avgTugas,
        weight: rc.rubric.tugas,
        tip:
          (ctx.pendingAssignments?.length || 0) > 0
            ? `Masih ada ${ctx.pendingAssignments!.length} tugas belum dikerjakan yang bernilai 0 di rata-rata jika belum dikumpul.`
            : (ctx.rejectedAssignments?.length || 0) > 0
            ? `Segera perbaiki ${ctx.rejectedAssignments!.length} tugas yang berstatus ditolak di menu Nilai.`
            : "Pertahankan ketepatan waktu dan kualitas pengerjaan tugas.",
      },
      { label: "PTS / UTS", score: rc.nilaiUts, weight: rc.rubric.uts, tip: "Jika nilai UTS masih 0 atau di bawah KKM, tanyakan jadwal susulan/remedial ke Pak Agan." },
      { label: "PAS / SAS / UAS", score: rc.nilaiUas, weight: rc.rubric.uas, tip: "Jika PAS/UAS belum dilaksanakan, fokus maksimalkan tugas dan latihan materi Bab 1–9." },
    ].filter((c) => c.weight > 0);

    components.sort((a, b) => a.score - b.score);
    const lowest = components[0];
    const rankingLines = components
      .map((c, idx) => `${idx + 1}. **${c.label}** (Bobot ${c.weight}%): **${c.score}** — ${c.tip}`)
      .join("\n");

    return (
      `Halo **${firstName}**${kelasLabel}, dari estimasi skor rapor saat ini (**${rc.finalScore}** · Predikat **${rc.predikat}**), komponen yang paling perlu diprioritaskan adalah **${lowest?.label || "Tugas"}** (skor saat ini: **${lowest?.score ?? 0}**).\n\n` +
      `**Urutan Prioritas Peningkatan Nilai:**\n` +
      `${rankingLines}`
    );
  }

  // 5. Peringkat Saya & Status Integritas Ujian
  if (
    normalized.includes("peringkat") ||
    normalized.includes("ranking") ||
    normalized.includes("integritas") ||
    normalized.includes("pelanggaran") ||
    /\brank\b/.test(normalized)
  ) {
    const cr = ctx.classRanking;
    const integ = ctx.integritySummary;
    const rc = ctx.reportCard;

    const rankSection =
      cr && cr.rank !== "-"
        ? `**Peringkat Sementara Kelas ${ctx.kelas || ""}:** **Peringkat ${cr.rank} dari ${cr.total} siswa**` +
          (rc ? ` (Estimasi Nilai Rapor: **${rc.finalScore}** · Predikat **${rc.predikat}**)` : "")
        : `**Peringkat Kelas:** Belum dapat dihitung saat ini.`;

    const integSection = integ
      ? `**Status Integritas Ujian:** **${integ.statusText}** (Total pelanggaran keluar *fullscreen* / pindah tab: **${integ.violationCount}x**)`
      : `**Status Integritas Ujian:** Terpantau baik.`;

    return (
      `Halo **${firstName}**${kelasLabel}, berikut status peringkat dan integritas belajarmu:\n\n` +
      `* ${rankSection}\n` +
      `* ${integSection}\n\n` +
      `*Tips: Jaga integritas dengan tidak berpindah tab atau keluar dari mode layar penuh saat ujian CBT berlangsung.*`
    );
  }

  // 6. Tugas yang ditolak / perlu perbaikan
  if (
    normalized.includes("tugas") &&
    (normalized.includes("ditolak") || normalized.includes("revisi") || normalized.includes("diperbaiki") || normalized.includes("perbaikan"))
  ) {
    const rejected = ctx.rejectedAssignments || [];
    if (rejected.length === 0) {
      return (
        `Halo **${firstName}**${kelasLabel}, kabar baik! Saat ini **tidak ada tugas yang berstatus ditolak**.\n\n` +
        `Tetap pastikan setiap link tugas Google Drive/Cloud yang dikirim sudah diatur ke akses **"Siapa saja yang memiliki link dapat melihat"** ya.`
      );
    }

    const listText = rejected
      .map((r, idx) => `${idx + 1}. **${r.title}**\n   Catatan Pak Agan: *${r.feedback}*`)
      .join("\n");

    return (
      `Halo **${firstName}**${kelasLabel}, ada **${rejected.length} tugas yang ditolak** dan perlu segera diperbaiki:\n\n` +
      `${listText}\n\n` +
      `Untuk memperbaiki: buka menu **Nilai** di bilah bawah, lalu klik **"Perbaiki & Kirim Ulang Tugas Ini"** pada kartu tugas tersebut.`
    );
  }

  // 7. Tugas belum dikerjakan / tenggat terdekat
  if (
    normalized.includes("tugas") &&
    (normalized.includes("belum") || normalized.includes("saya") || normalized.includes("ku") || normalized.includes("apa saja") || normalized.includes("deadline") || normalized.includes("tenggat") || normalized.includes("terdekat"))
  ) {
    const pending = ctx.pendingAssignments || [];
    const rejectedCount = ctx.rejectedAssignments?.length || 0;
    const waitingCount = ctx.waitingReviewCount || 0;
    const doneCount = ctx.completedTasksCount || 0;

    if (pending.length === 0) {
      return (
        `Hebat **${firstName}**${kelasLabel}! **Semua tugas aktif sudah kamu kumpulkan.**\n\n` +
        `Ringkasan status tugasmu:\n` +
        `* Sudah dikirim / selesai: **${doneCount} tugas**\n` +
        `* Menunggu penilaian guru: **${waitingCount} tugas**` +
        (rejectedCount > 0 ? `\n* Perlu perbaikan (ditolak): **${rejectedCount} tugas** (cek menu **Nilai**)` : "")
      );
    }

    const nearestTask = pending[0];
    const listText = pending
      .map((t, idx) => {
        const overdueTag = t.isOverdue ? " *(Melewati tenggat)*" : idx === 0 ? " *(Tenggat terdekat)*" : "";
        return `${idx + 1}. **${t.title}** (${t.bab}) — Tenggat: ${t.deadlineLabel}${overdueTag}`;
      })
      .join("\n");

    return (
      `Halo **${firstName}**${kelasLabel}, masih ada **${pending.length} tugas yang belum dikerjakan** (prioritas terdekat: **${nearestTask.title}** — *${nearestTask.deadlineLabel}*):\n\n` +
      `${listText}\n\n` +
      `Status lainnya: **${waitingCount}** menunggu dinilai · **${doneCount}** sudah terkumpul` +
      (rejectedCount > 0 ? ` · **${rejectedCount}** ditolak (perlu revisi)` : "") +
      `.\nBuka menu **Tugas Siswa** untuk melihat instruksi dan mengirim tautan jawaban.`
    );
  }

  // 8. Jadwal Ujian Aktif (Non-Rahasia: tanpa token/kunci)
  if (
    normalized.includes("jadwal ujian") ||
    normalized.includes("ujian aktif") ||
    normalized.includes("ujian hari ini") ||
    normalized.includes("ujian saat ini") ||
    (normalized.includes("ada") && normalized.includes("ujian"))
  ) {
    const exams = ctx.activeExams || [];
    if (exams.length === 0) {
      return `Halo **${firstName}**${kelasLabel}, saat ini **belum ada jadwal Ujian Online (CBT) yang aktif** untuk kelasmu.`;
    }

    const listText = exams
      .map(
        (ex, idx) =>
          `${idx + 1}. **${ex.title}** (${ex.bab}) · Durasi ${ex.durationMinutes} menit · Status: **${
            ex.isFinished ? "Sudah Selesai" : "Belum Dikerjakan"
          }**`
      )
      .join("\n");

    return (
      `Halo **${firstName}**${kelasLabel}, berikut daftar **Ujian Online (CBT)** yang tersedia untuk kelasmu:\n\n` +
      `${listText}\n\n` +
      `*Catatan keamanan: Token ujian bersifat rahasia dan hanya dibagikan langsung oleh Pak Agan saat ujian dimulai.*`
    );
  }

  // 9. Ringkasan Kehadiran & Nilai Pribadi
  if (
    normalized.includes("kehadiran") ||
    normalized.includes("absensi") ||
    normalized.includes("presensi") ||
    normalized.includes("nilai saya") ||
    normalized.includes("nilaiku") ||
    normalized.includes("ringkasan nilai")
  ) {
    const att = ctx.attendanceSummary;
    const gr = ctx.gradesSummary;
    const rc = ctx.reportCard;

    const attSection = att
      ? `**Kehadiran (${att.percentage}% · ${att.rubricStatus}):**\n` +
        `Total **${att.totalMeetings} pertemuan** → Hadir: **${att.hadir}** · Sakit: **${att.sakit}** · Izin: **${att.izin}** · Alpa: **${att.alpa}** · Dispen: **${att.dispen}**`
      : `**Kehadiran:** Belum ada data presensi yang tercatat untuk kelasmu.`;

    const gradeSection = gr
      ? `**Ringkasan Nilai Pribadi:**\n` +
        `Penilaian masuk: **${gr.gradedCount} item** · Rata-rata Tugas: **${gr.avgTugas}** · Rata-rata Ujian: **${gr.avgUjian}**` +
        (rc ? `\nEstimasi Nilai Rapor Sementara: **${rc.finalScore}** (Predikat **${rc.predikat}**)` : "")
      : `**Nilai:** Cek rincian nilai per tugas/ujian pada menu **Nilai**.`;

    return `Halo **${firstName}**${kelasLabel}, berikut ringkasan data belajarmu:\n\n${attSection}\n\n${gradeSection}`;
  }

  // 10. Materi Ajar Tersedia & Status Simulasi
  if (
    normalized.includes("materi") &&
    (normalized.includes("tersedia") ||
      normalized.includes("apa saja") ||
      normalized.includes("belum selesai") ||
      normalized.includes("progres") ||
      normalized.includes("simulasi"))
  ) {
    const mats = ctx.materials || [];
    const matsSection =
      mats.length === 0
        ? `Saat ini belum ada modul materi yang diterbitkan pada menu **Materi Ajar**.`
        : `Ada **${mats.length} modul Materi Ajar** yang tersedia:\n` +
          mats
            .slice(0, 8)
            .map((m, idx) => `${idx + 1}. **${m.title}** (${m.bab}) — *${m.progressStatus}*`)
            .join("\n");

    const simulasiSection = normalized.includes("simulasi")
      ? `\n\n**Status Menu Simulasi Interaktif:** ${
          ctx.isSimulasiEnabled
            ? "**Aktif** — kamu bisa langsung membuka menu **Simulasi** dari Beranda!"
            : "**Belum diaktifkan** oleh Pak Agan untuk kelasmu saat ini."
        }`
      : "";

    return (
      `Halo **${firstName}**${kelasLabel}, berikut info modul belajarmu:\n\n` +
      `${matsSection}` +
      `${simulasiSection}\n\n` +
      `Buka menu **Materi Ajar** untuk membaca modul PDF dan menandai progres belajarmu.`
    );
  }

  // 11. Kisi-Kisi Ujian
  if (normalized.includes("kisi")) {
    const kList = ctx.kisiKisiList || [];
    if (kList.length === 0) {
      return `Halo **${firstName}**${kelasLabel}, saat ini belum ada data **Kisi-Kisi Ujian** (PTS/PSAS/Preetes/Postes) yang diterbitkan untuk kelasmu. Cek berkala di menu **Kisi-Kisi** pada Beranda ya.`;
    }
    const listText = kList
      .slice(0, 8)
      .map(
        (k, idx) =>
          `${idx + 1}. **[${k.category}] ${k.title}** (${k.bab}) — ${
            k.hasDriveLink ? "Link Drive tersedia" : "Menunggu link Drive guru"
          }`
      )
      .join("\n");
    return (
      `Halo **${firstName}**${kelasLabel}, berikut daftar **Kisi-Kisi Ujian** yang tersedia untuk kelasmu:\n\n` +
      `${listText}\n\n` +
      `Buka menu **Kisi-Kisi** di Beranda untuk langsung mengklik tautan Google Drive masing-masing kisi-kisi.`
    );
  }

  // 12. Status Simulasi standalone
  if (normalized.includes("simulasi") && (normalized.includes("aktif") || normalized.includes("status") || normalized.includes("kenapa") || normalized.includes("tidak bisa"))) {
    return ctx.isSimulasiEnabled
      ? `Halo **${firstName}**${kelasLabel}, menu **Simulasi** saat ini **sudah aktif** dan bisa kamu buka langsung dari Beranda!`
      : `Halo **${firstName}**${kelasLabel}, menu **Simulasi** saat ini memang **belum diaktifkan** oleh Pak Agan untuk kelasmu. Nantikan pengumuman selanjutnya ya!`;
  }

  return null;
}

export function resolveLocalSipinterReply(
  rawText: string,
  firstName: string,
  ctx?: SipinterStudentContext
): { handled: true; reply: string; isConfidentialBlock?: boolean } | { handled: false } {
  const normalized = normalizeText(rawText);
  if (!normalized) return { handled: false };

  // 1. Strict secret/confidential block
  const secretTopic = isConfidentialRequest(normalized);
  if (secretTopic) {
    return {
      handled: true,
      isConfidentialBlock: true,
      reply:
        `Mohon maaf **${firstName}**, **${secretTopic}** termasuk data **rahasia** yang dilindungi sistem keamanan Si-Pinter App sehingga tidak dapat diakses atau dibagikan melalui AI.\n\n` +
        `Silakan hubungi Pak Agan secara langsung apabila membutuhkan informasi resmi terkait pelaksanaan ujian atau akun.`,
    };
  }

  // 2. Live non-confidential SiPinter data answer (0 server Gemini quota)
  const liveReply = answerLiveSipinterData(normalized, firstName, ctx);
  if (liveReply) {
    return { handled: true, reply: liveReply };
  }

  // 3. Static local app guide & Bab 1-9 knowledge (0 server Gemini quota)
  const wordCount = normalized.split(" ").length;
  for (const rule of LOCAL_TOPICS) {
    if (rule.maxWordsForExact && wordCount > rule.maxWordsForExact) continue;
    if (rule.skipIfIncludes && rule.skipIfIncludes.some((skip) => normalized.includes(skip))) continue;

    const matched = rule.matchAny.some((group) =>
      group.every((keyword) => {
        if (keyword.includes(" ")) return normalized.includes(keyword);
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(normalized);
      })
    );
    if (matched) {
      return { handled: true, reply: rule.buildReply(firstName) };
    }
  }

  return { handled: false };
}

/**
 * Builds a clean, strictly non-confidential prompt ready to be pasted into
 * the student's own Gemini AI session (`https://gemini.google.com/app`).
 */
export function buildStudentGeminiPrompt(
  firstName: string,
  userQuestion: string,
  ctx?: SipinterStudentContext
): string {
  const lines: string[] = [];
  lines.push(`Saya ${firstName}, siswa Informatika Kelas X${ctx?.kelas ? ` (${ctx.kelas})` : ""} di SMAN 1 Cililin yang belajar menggunakan aplikasi Si-Pinter App.`);

  if (ctx) {
    const contextSnippets: string[] = [];
    if (ctx.todayDateLabel) contextSnippets.push(`Tanggal: ${ctx.todayDateLabel}`);
    if (ctx.pendingAssignments && ctx.pendingAssignments.length > 0) {
      const titles = ctx.pendingAssignments.slice(0, 3).map((t) => `${t.title} (${t.bab})`).join(", ");
      contextSnippets.push(`Tugas aktif belum selesai: ${titles}`);
    }
    if (ctx.materials && ctx.materials.length > 0) {
      const activeMats = ctx.materials.slice(0, 4).map((m) => `${m.title} [${m.bab}]`).join(", ");
      contextSnippets.push(`Materi tersedia: ${activeMats}`);
    }
    if (contextSnippets.length > 0) {
      lines.push(`Konteks belajar Si-Pinter (non-rahasia): ${contextSnippets.join(" | ")}.`);
    }
  }

  if (userQuestion.trim()) {
    lines.push(`\nPertanyaan saya:\n${userQuestion.trim()}`);
  } else {
    lines.push(`\nMohon bantu saya memahami materi Informatika Kelas X atau mengerjakan tugas di atas dengan penjelasan yang runtut dan mudah dipahami.`);
  }

  return lines.join("\n");
}
