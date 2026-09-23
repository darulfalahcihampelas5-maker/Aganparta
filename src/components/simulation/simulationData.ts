export type LevelDifficulty = "pemula" | "menengah" | "lanjutan";

export interface PillarInfo {
  id: "dekomposisi" | "pola" | "abstraksi" | "algoritma";
  name: string;
  shortDesc: string;
  icon: string;
  color: string;
  accentBg: string;
  borderColor: string;
}

export const CT_PILLARS: Record<string, PillarInfo> = {
  dekomposisi: {
    id: "dekomposisi",
    name: "Dekomposisi (Decomposition)",
    shortDesc: "Memecah masalah kompleks menjadi sub-masalah kecil yang terkelola.",
    icon: "Boxes",
    color: "text-emerald-700",
    accentBg: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  pola: {
    id: "pola",
    name: "Pengenalan Pola (Pattern Recognition)",
    shortDesc: "Menemukan kemiripan, tren, dan keteraturan dalam persoalan.",
    icon: "Sparkles",
    color: "text-sky-700",
    accentBg: "bg-sky-50",
    borderColor: "border-sky-200",
  },
  abstraksi: {
    id: "abstraksi",
    name: "Abstraksi (Abstraction)",
    shortDesc: "Menyaring info penting dan mengabaikan rincian yang tidak relevan.",
    icon: "Filter",
    color: "text-amber-700",
    accentBg: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  algoritma: {
    id: "algoritma",
    name: "Perancangan Algoritma (Algorithm)",
    shortDesc: "Menyusun instruksi terurut dan logis untuk mencapai solusi pasti.",
    icon: "Code2",
    color: "text-indigo-700",
    accentBg: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
};

export interface Question {
  id: number;
  pillar: "dekomposisi" | "pola" | "abstraksi" | "algoritma" | "umum";
  question: string;
  scenario?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points: number;
}

export interface MaterialSection {
  title: string;
  pillar: "dekomposisi" | "pola" | "abstraksi" | "algoritma";
  content: string;
  example: string;
  smaContext: string;
  keyTakeaways: string[];
}

export interface LevelConfig {
  id: LevelDifficulty;
  title: string;
  subtitle: string;
  difficultyBadge: string;
  badgeColor: string;
  themeColor: string;
  ringColor: string;
  accentBg: string;
  targetAudience: string;
  targetGoals: string[];
  passingScore: number;
  modules: MaterialSection[];
  quizQuestions: Question[];
  simulatorType: "rover" | "graph" | "sorting";
  simulatorTitle: string;
  simulatorSubtitle: string;
}

export const SIMULATION_LEVELS: LevelConfig[] = [
  {
    id: "pemula",
    title: "Tingkat 1: Pemula (Beginner Explorer)",
    subtitle: "Fondasi 4 Pilar Berpikir Komputasional & Perintah Dasar",
    difficultyBadge: "Tingkat Pemula",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    themeColor: "from-emerald-600 to-teal-700",
    ringColor: "ring-emerald-500",
    accentBg: "bg-emerald-50/50",
    targetAudience: "Siswa Kelas X yang baru mengenal konsep Informatika Kurikulum Merdeka",
    targetGoals: [
      "Mengidentifikasi 4 pilar berpikir komputasional dalam situasi sehari-hari.",
      "Menerapkan dekomposisi untuk menyusun tugas kompleks.",
      "Mengarahkan robot Rover ke tujuan dengan urutan perintah logika (sekuensial).",
    ],
    passingScore: 70,
    modules: [
      {
        title: "Pilar 1: Dekomposisi (Memecah Masalah)",
        pillar: "dekomposisi",
        content:
          "Dekomposisi adalah proses memecah masalah yang rumit, besar, atau kompleks menjadi bagian-bagian yang jauh lebih kecil, sederhana, dan dapat diselesaikan satu per satu (divide and conquer).",
        example:
          "Ketika membuat aplikasi mobile, kita membagi sistem menjadi halaman login, halaman beranda, sistem keranjang, dan modul pembayaran.",
        smaContext:
          "Contoh Nyata di SMA: Mempersiapkan Pentas Seni (Pensi) OSIS. Kita membaginya menjadi Seksi Panggung, Seksi Konsumsi, Seksi Dokumentasi, dan Seksi Keamanan. Bayangkan jika satu orang mengurus semuanya sekaligus tanpa pembagian tim!",
        keyTakeaways: [
          "Masalah besar tampak menakutkan hingga kita membaginya.",
          "Setiap sub-masalah dapat dikerjakan secara paralel.",
          "Mempermudah pelacakan kesalahan (debugging).",
        ],
      },
      {
        title: "Pilar 2: Pengenalan Pola (Pattern Recognition)",
        pillar: "pola",
        content:
          "Pengenalan Pola adalah kemampuan menemukan kesamaan, keteraturan, pengulangan, atau tren dari berbagai masalah atau data yang kita hadapi.",
        example:
          "Sistem anti-spam email membaca pola kata seperti 'Selamat Anda Menang 100 Juta' untuk menandai pesan mencurigakan secara otomatis.",
        smaContext:
          "Contoh Nyata di SMA: Mengenali pola soal ujian matematika tahun lalu, atau menyadari bahwa setiap pagi hari Senin jalanan depan sekolah selalu macet pukul 06.45.",
        keyTakeaways: [
          "Membantu kita menggunakan kembali solusi yang pernah berhasil sebelumnya.",
          "Menghemat waktu dan tenaga komputasi.",
          "Mendasari teknologi Artificial Intelligence dan Machine Learning.",
        ],
      },
      {
        title: "Pilar 3: Abstraksi (Fokus pada yang Pokok)",
        pillar: "abstraksi",
        content:
          "Abstraksi adalah teknik menyaring informasi dengan mempertahankan hanya rincian yang penting dan esensial, serta mengabaikan detail-detail yang tidak relevan bagi solusi masalah.",
        example:
          "Peta rute KRL / MRT Jakarta hanya menampilkan stasiun pemberhentian dan garis jalur kereta, tanpa menggambarkan pohon, trotoar, atau rumah warga di sepanjang rel.",
        smaContext:
          "Contoh Nyata di SMA: Buku Biodata Siswa sekolah hanya mencatat NISN, Nama Lengkap, dan Tanggal Lahir. Sekolah tidak perlu mencatat warna sepatu favorit atau merk pensil yang kamu gunakan.",
        keyTakeaways: [
          "Menghindari kepenuhan informasi (information overload).",
          "Membuat model masalah menjadi bersih dan mudah diproses.",
          "Menjadi pondasi pembuatan peta, diagram alur, dan arsitektur perangkat lunak.",
        ],
      },
      {
        title: "Pilar 4: Perancangan Algoritma (Langkah Logis Terurut)",
        pillar: "algoritma",
        content:
          "Algoritma adalah serangkaian instruksi langkah-demi-langkah yang logis, terurut, berurutan, dan tanpa ambigu untuk menyelesaikan suatu tugas atau mencapai hasil yang diinginkan.",
        example:
          "Resep memasak mie instan: 1. Didihkan air, 2. Masukkan mie selama 3 menit, 3. Tiriskan dan campur bumbu, 4. Sajikan.",
        smaContext:
          "Contoh Nyata di SMA: Langkah-langkah menyalakan proyektor kelas: Colok kabel power -> sambungkan kabel HDMI ke laptop -> tekan tombol daya proyektor -> pilih mode duplicate screen.",
        keyTakeaways: [
          "Instruksi harus jelas dan tidak menimbulkan interpretasi ganda.",
          "Urutan langkah sangat menentukan keberhasilan hasil akhir.",
          "Harus memiliki kondisi awal (input) dan kondisi akhir (output).",
        ],
      },
    ],
    quizQuestions: [
      {
        id: 101,
        pillar: "dekomposisi",
        scenario:
          "Panitia Pensi SMA Negeri 1 berencana menyelenggarakan festival musik akbar. Ketua panitia membagi kepengurusan menjadi divisi Konsumsi, Tiket, Acara, dan Publikasi agar persiapan berjalan efektif.",
        question:
          "Penerapan pilar berpikir komputasional apakah yang dilakukan oleh ketua panitia tersebut?",
        options: [
          "Abstraksi, karena mengabaikan detail penonton",
          "Dekomposisi, karena memecah acara besar menjadi divisi-divisi terkelola",
          "Pengenalan Pola, karena mengulang pensi tahun lalu",
          "Algoritma, karena menyusun tata tertib penonton",
        ],
        correctIndex: 1,
        explanation:
          "Dekomposisi memecah satu masalah/proyek besar (Pensi) menjadi beberapa bagian kecil yang terfokus (divisi konsumsi, ticketing, acara, publikasi).",
        points: 20,
      },
      {
        id: 102,
        pillar: "abstraksi",
        scenario:
          "Budi ingin naik bus TransJakarta dari Halte Blok M menuju Monas. Ia membuka peta jalur busway resmi.",
        question:
          "Mengapa peta jalur TransJakarta tidak memuat gambar gedung pencakar langit atau toko di sepanjang jalan Sudirman?",
        options: [
          "Karena pembuat peta lupa memasukkan gambar toko",
          "Karena menerapkan pilar Abstraksi untuk hanya menyajikan halte & transit yang esensial bagi penumpang",
          "Karena menerapkan Algoritma untuk mempercepat waktu tempuh bus",
          "Karena menerapkan Dekomposisi jalan raya",
        ],
        correctIndex: 1,
        explanation:
          "Pilar Abstraksi membuang detail yang tidak penting (seperti toko, tiang listrik, pohon) agar peta tetap bersih dan penumpang dapat fokus pada urutan halte dan transit.",
        points: 20,
      },
      {
        id: 103,
        pillar: "pola",
        scenario:
          "Seorang programmer memperhatikan bahwa setiap kali kode sistem mencetak deret: 2, 4, 8, 16, 32, angka berikutnya selalu merupakan hasil kali 2 dari angka sebelumnya.",
        question:
          "Pilar berpikir komputasional apa yang digunakan saat menemukan aturan keteraturan tersebut?",
        options: [
          "Pengenalan Pola (Pattern Recognition)",
          "Abstraksi Data",
          "Dekomposisi Matematika",
          "Pengujian Kode (Debugging)",
        ],
        correctIndex: 0,
        explanation:
          "Menemukan keteraturan atau pola kelipatan dalam barisan bilangan merupakan contoh nyata dari Pengenalan Pola (Pattern Recognition).",
        points: 20,
      },
      {
        id: 104,
        pillar: "algoritma",
        scenario:
          "Rani ingin memprogram robot pembersih lantai otomatis agar bergerak dari sudut ruang tamu ke pintu keluar.",
        question:
          "Manakah urutan instruksi di bawah ini yang paling memenuhi kaidah Algoritma yang tepat dan berurutan?",
        options: [
          "1. Belok sesuka hati, 2. Jika lelah berhenti, 3. Maju terus",
          "1. Nyalakan mesin, 2. Maju 5 langkah, 3. Putar kanan 90°, 4. Maju 3 langkah ke pintu, 5. Matikan mesin",
          "1. Matikan mesin, 2. Bersihkan debu, 3. Maju 10 meter",
          "1. Periksa cuaca di luar rumah, 2. Beli robot baru, 3. Hubungkan wifi",
        ],
        correctIndex: 1,
        explanation:
          "Algoritma yang baik memiliki langkah sekuensial yang pasti, terarah, memiliki kondisi awal (nyalakan mesin) dan kondisi akhir (matikan mesin).",
        points: 20,
      },
      {
        id: 105,
        pillar: "umum",
        scenario:
          "Siswa SMA diminta membuat rangkuman materi 100 halaman buku cetak menjadi mind-map 1 lembar karton.",
        question:
          "Dua pilar berpikir komputasional yang paling dominan digunakan dalam proses merangkum ini adalah...",
        options: [
          "Enkripsi dan Dekripsi",
          "Dekomposisi (memilah bab) dan Abstraksi (mengambil intisari penting saja)",
          "Algoritma dan Perakitan Perangkat Keras",
          "Koneksi Internet dan Cloud Computing",
        ],
        correctIndex: 1,
        explanation:
          "Dekomposisi digunakan saat membagi isi 100 halaman per bab/topik, dan Abstraksi digunakan untuk mengambil poin-poin terpenting saja ke dalam mind map.",
        points: 20,
      },
    ],
    simulatorType: "rover",
    simulatorTitle: "Simulator Cyber Rover: Navigasi Dasar",
    simulatorSubtitle: "Susun blok perintah untuk mengarahkan rover mengambil data chip dan mencapai stasiun target!",
  },
  {
    id: "menengah",
    title: "Tingkat 2: Menengah (Intermediate Strategist)",
    subtitle: "Abstraksi Graf, Rute Optimal & Perulangan Logika",
    difficultyBadge: "Tingkat Menengah",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
    themeColor: "from-sky-600 to-indigo-700",
    ringColor: "ring-sky-500",
    accentBg: "bg-sky-50/50",
    targetAudience: "Siswa Kelas X yang memahami dasar dan siap mengoptimasi logika graf serta perulangan.",
    targetGoals: [
      "Memodelkan masalah dunia nyata ke dalam bentuk Graf (Simpul/Node dan Sisi/Edge).",
      "Menentukan rute terpendek dengan menjumlahkan bobot jarak/latensi secara optimal.",
      "Menggunakan konsep Perulangan (Loop) untuk menyederhanakan kode sekuensial.",
    ],
    passingScore: 75,
    modules: [
      {
        title: "Representasi Masalah Menggunakan Graf (Simpul & Jalur)",
        pillar: "abstraksi",
        content:
          "Dalam ilmu komputer, Graf adalah model matematika yang terdiri dari Simpul (Vertex/Node) yang mewakili lokasi/entitas, dan Sisi (Edge) yang menghubungkan antar simpul dengan nilai bobot tertentu (jarak, biaya, atau latensi waktu).",
        example:
          "Aplikasi Google Maps memodelkan persimpangan jalan sebagai simpul (node) dan jalan raya sebagai garis berbobot (jarak km atau menit kemacetan).",
        smaContext:
          "Contoh Nyata di SMA: Rute angkutan umum dari rumahmu menuju SMA. Kamu memilih rute transit yang paling sedikit menghabiskan ongkos dan waktu tempuh.",
        keyTakeaways: [
          "Graf adalah bentuk abstraksi sempurna dari jaringan transportasi dan internet.",
          "Algoritma Dijkstra digunakan komputer untuk menghitung rute tercepat secara otomatis.",
          "Menyederhanakan jalan berliku menjadi garis hubungan antar simpul.",
        ],
      },
      {
        title: "Pola Perulangan (Looping) & Efisiensi Solusi",
        pillar: "pola",
        content:
          "Jika sebuah tindakan harus dilakukan berkali-kali dengan cara yang persis sama, kita tidak perlu menulis instruksi berulang kali. Kita cukup menggunakan Perulangan (Loop) seperti `REPEAT(N) { instruksi }`.",
        example:
          "Daripada menulis: `Maju; Maju; Maju; Maju; Maju;`, kita cukup menulis: `Ulangi 5 kali: Maju`.",
        smaContext:
          "Contoh Nyata di SMA: Bel masuk berbunyi 3 kali: 'Teeet, Teeet, Teeet'. Bel sekolah tidak diprogram manual 3 tombol terpisah, melainkan loop 3 kali.",
        keyTakeaways: [
          "Mengurangi panjang instruksi kode secara signifikan.",
          "Mencegah kesalahan ketik (human error) saat mengulang instruksi.",
          "Membuat algoritma lebih elegan dan mudah dirawat.",
        ],
      },
      {
        title: "Dekomposisi Logika Kondisional (Percabangan IF-ELSE)",
        pillar: "algoritma",
        content:
          "Percabangan adalah mekanisme dalam algoritma untuk mengambil keputusan berdasarkan kondisi tertentu yang bernilai benar (True) atau salah (False).",
        example:
          "`JIKA ada rintangan di depan MAKA belok kanan, JIKA TIDAK MAKA maju 1 langkah`.",
        smaContext:
          "Contoh Nyata di SMA: Sistem presensi SiPinter: `JIKA jam login <= 07.00 MAKA status = Tepat Waktu, JIKA TIDAK MAKA status = Terlambat`.",
        keyTakeaways: [
          "Membuat program mampu beradaptasi dengan lingkungan dinamis.",
          "Membantu robot menghindari tabrakan secara otonom.",
          "Dasar dari logika kecerdasan buatan.",
        ],
      },
    ],
    quizQuestions: [
      {
        id: 201,
        pillar: "abstraksi",
        scenario:
          "Sebuah paket data internet dikirim dari Server Pusat (A) ke Server Sekolah (F). Ada dua jalur: Jalur 1 melewati (A -> B -> F) dengan latensi 12ms + 18ms = 30ms. Jalur 2 melewati (A -> C -> D -> F) dengan latensi 5ms + 6ms + 7ms = 18ms.",
        question:
          "Manakah jalur yang lebih optimal dipilih oleh router jaringan, dan mengapa?",
        options: [
          "Jalur 1, karena hanya melewati 1 stasiun transit",
          "Jalur 2, karena total latensi waktu akumulatifnya lebih kecil (18ms dibanding 30ms)",
          "Jalur 1 dan 2 sama saja karena sama-sama sampai di F",
          "Paket data harus dibagi menjadi dua jalur secara acak",
        ],
        correctIndex: 1,
        explanation:
          "Dalam penentuan rute optimal (Shortest Path), yang dihitung adalah jumlah bobot terkecil (18ms vs 30ms), bukan semata-mata jumlah simpul yang dilewati.",
        points: 20,
      },
      {
        id: 202,
        pillar: "pola",
        scenario:
          "Robot penjelajah harus bergerak lurus sejauh 10 meter. Setiap langkah menempuh 1 meter.",
        question:
          "Penerapan struktur kontrol algoritma manakah yang paling efisien dan ringkas?",
        options: [
          "Menulis perintah 'Maju 1 meter' sebanyak 10 kali secara manual",
          "Menggunakan perulangan: 'Ulangi 10 kali: Maju 1 meter'",
          "Menggunakan percabangan: 'Jika lapar maka makan'",
          "Mematikan robot lalu menyalakannya kembali di meter ke-10",
        ],
        correctIndex: 1,
        explanation:
          "Konsep perulangan (loop) mengabstraksi tindakan berulang menjadi satu blok instruksi ringkas `repeat(10)` yang jauh lebih efisien.",
        points: 20,
      },
      {
        id: 203,
        pillar: "algoritma",
        scenario:
          "Perhatikan pseudocode berikut:\nSET X = 5\nSET Y = 10\nIF X < Y THEN\n   PRINT 'Kondisi A'\nELSE\n   PRINT 'Kondisi B'\nENDIF",
        question: "Apakah output yang dicetak oleh program di atas?",
        options: ["Kondisi A", "Kondisi B", "Kondisi A dan B", "Tidak ada output"],
        correctIndex: 0,
        explanation:
          "Karena nilai X (5) memang lebih kecil dari Y (10), maka kondisi IF bernilai BENAR (True), sehingga mencetak 'Kondisi A'.",
        points: 20,
      },
      {
        id: 204,
        pillar: "abstraksi",
        scenario:
          "Dalam pembuatan peta relasi antarteman kelas di media sosial, siswa direpresentasikan sebagai titik (Node) dan hubungan pertemanan sebagai garis penghubung (Edge).",
        question:
          "Struktur data konseptual berpikir komputasional apa yang sedang diterapkan?",
        options: ["Graf (Graph)", "Array 1 Dimensi", "Stack (Tumpukan)", "Harddisk Drive"],
        correctIndex: 0,
        explanation:
          "Model titik (nodes) dan garis penghubung (edges) adalah definisi dari struktur Graf, yang banyak dipakai Facebook, Instagram, dan jejaring sosial untuk memodelkan pertemanan.",
        points: 20,
      },
      {
        id: 205,
        pillar: "dekomposisi",
        scenario:
          "Tim robotic SMA ingin membuat mobil pintar yang bisa berhenti otomatis di depan lampu merah dan berbelok saat ada jurang.",
        question:
          "Bagaimana cara melakukan dekomposisi terhadap sistem sensor mobil pintar tersebut?",
        options: [
          "Membeli baterai paling mahal di toko",
          "Membagi sensor menjadi: 1. Sensor Warna (deteksi lampu merah), 2. Sensor Jarak Ultrasonik (deteksi jurang/halangan)",
          "Menyuruh mobil berjalan tanpa baterai",
          "Mengganti roda mobil dengan roda sepeda",
        ],
        correctIndex: 1,
        explanation:
          "Dekomposisi memilah fungsi sensor berdasarkan tugas spesifiknya: modul deteksi visual warna dan modul deteksi jarak ultrasonik.",
        points: 20,
      },
    ],
    simulatorType: "graph",
    simulatorTitle: "Simulator Abstraksi Jaringan & Rute Tercepat",
    simulatorSubtitle: "Temukan jalur data tercepat antar-server dengan total latensi paling minimum!",
  },
  {
    id: "lanjutan",
    title: "Tingkat 3: Lanjutan (Advanced Master of Logic)",
    subtitle: "Algoritma Pencarian (Search), Pengurutan (Sorting) & Optimasi",
    difficultyBadge: "Tingkat Lanjutan",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    themeColor: "from-purple-600 to-violet-800",
    ringColor: "ring-purple-500",
    accentBg: "bg-purple-50/50",
    targetAudience: "Siswa Kelas X yang ingin mengasah nalar kritis olimpiade sains / AKM & problem solving tingkat tinggi.",
    targetGoals: [
      "Memahami perbedaan Binary Search (Pencarian Bagi Dua) vs Linear Search.",
      "Menganalisis mekanisme kerja pengurutan data (Bubble Sort & Insertion Sort).",
      "Mengoptimalkan jumlah perbandingan dan pertukaran langkah data.",
    ],
    passingScore: 80,
    modules: [
      {
        title: "Pencarian Biner (Binary Search) vs Pencarian Linier",
        pillar: "algoritma",
        content:
          "Jika kita mencari nama siswa di buku absen yang belum terurut, kita terpaksa memeriksa dari nama pertama sampai terakhir (Linear Search). Namun, jika data SUDAH TERURUT (A-Z), kita bisa langsung membuka bagian tengah dan membuang setengah data yang tidak mungkin (Binary Search).",
        example:
          "Menebak angka rahasia antara 1 - 100. Tebak angka tengah: 50. Jika terlalu kecil, buang 1-50, lalu tebak tengahnya 75. Maksimal hanya perlu 7 tebakan untuk menemukan angka dari 100 kemungkinan!",
        smaContext:
          "Contoh Nyata di SMA: Mencari kata di kamus bahasa Inggris tebal 1.000 halaman. Kamu tidak membalik halaman satu per satu dari halaman 1, melainkan membuka tengah kamus.",
        keyTakeaways: [
          "Syarat mutlak Binary Search: Data harus sudah dalam kondisi terurut (sorted).",
          "Kompleksitas waktu: O(log N) sangat cepat dibandingkan O(N).",
          "Menerapkan strategi Divide and Conquer.",
        ],
      },
      {
        title: "Algoritma Pengurutan Data (Sorting): Bubble Sort & Insertion",
        pillar: "algoritma",
        content:
          "Sorting adalah proses menyusun elemen-elemen data dalam urutan tertentu (menaik / ascending atau menurun / descending). Bubble Sort bekerja dengan membandingkan dua elemen berdampingan dan menukarnya jika urutannya salah.",
        example:
          "Deret [5, 2, 8]. Bandingkan 5 dan 2 -> tukar menjadi [2, 5, 8]. Bandingkan 5 dan 8 -> sudah benar. Data selesai diurutkan.",
        smaContext:
          "Contoh Nyata di SMA: Guru mengurutkan lembar ujian siswa dari nilai tertinggi ke terendah sebelum membagikan rapor.",
        keyTakeaways: [
          "Data yang rapi mempermudah proses pencarian dan analisis statistik.",
          "Jumlah langkah pertukaran (swap) menjadi tolok ukur efisiensi algoritma.",
          "Membantu memahami bagaimana mesin komputer memproses memori.",
        ],
      },
      {
        title: "Analisis Efisiensi dan Kompleksitas Berpikir Komputasional",
        pillar: "dekomposisi",
        content:
          "Dua program komputer bisa menghasilkan output yang sama, namun program yang dirancang dengan berpikir komputasional yang matang akan menggunakan lebih sedikit memori dan waktu eksekusi yang jauh lebih cepat.",
        example:
          "Mencari data di 1.000.000 data: Linear Search butuh hingga 1.000.000 langkah, sedangkan Binary Search hanya butuh maksimal 20 langkah!",
        smaContext:
          "Contoh Nyata di SMA: Membuat script spreadsheet untuk merekap nilai 1.000 siswa SMA dalam 1 detik versus harus menghitung manual satu per satu dengan kalkulator.",
        keyTakeaways: [
          "Efisiensi adalah esensi dari ilmu komputer modern.",
          "Berpikir komputasional melatih siswa menemukan cara tersmart, bukan sekadar cara terlama.",
          "Kunci sukses dalam olimpiade informatika dan dunia profesional industri IT.",
        ],
      },
    ],
    quizQuestions: [
      {
        id: 301,
        pillar: "algoritma",
        scenario:
          "Seorang pustakawan ingin mencari buku berseri nomor 72 pada rak buku yang memuat seri 1 sampai 100 secara berurutan. Ia membuka tepat di seri nomor 50. Mengetahui 72 lebih besar dari 50, ia mengabaikan seri 1 sampai 50.",
        question: "Metode pencarian apakah yang sedang diterapkan pustakawan tersebut?",
        options: [
          "Binary Search (Pencarian Biner)",
          "Linear Search (Pencarian Linier)",
          "Random Search (Pencarian Acak)",
          "Bubble Sort",
        ],
        correctIndex: 0,
        explanation:
          "Membuka bagian tengah dan mengeliminasi setengah kelompok data yang tidak cocok adalah karakteristik utama algoritma Binary Search.",
        points: 20,
      },
      {
        id: 302,
        pillar: "algoritma",
        scenario:
          "Diberikan deret angka: [9, 3, 1, 5]. Kita ingin mengurutkannya dari yang terkecil menggunakan Bubble Sort pada lintasan (pass) pertama.",
        question:
          "Bagaimanakah urutan deret setelah perbandingan pertama antara elemen ke-1 (9) dan elemen ke-2 (3)?",
        options: [
          "[3, 9, 1, 5] (karena 9 dan 3 ditukar)",
          "[9, 3, 1, 5] (tetap tidak berubah)",
          "[1, 3, 5, 9] (langsung terurut instan)",
          "[9, 1, 3, 5]",
        ],
        correctIndex: 0,
        explanation:
          "Karena 9 > 3, maka aturan pengurutan menaik (ascending) mengharuskan posisi keduanya ditukar (swap), sehingga susunan menjadi [3, 9, 1, 5].",
        points: 20,
      },
      {
        id: 303,
        pillar: "umum",
        scenario:
          "Terdapat 1.024 nama siswa terurut abjad di sistem pendaftaran SMA. Dengan algoritma Binary Search, berapa kali maksimal pengecekan yang dibutuhkan untuk menemukan satu nama siswa?",
        question: "Hitung jumlah langkah maksimal perbandingan!",
        options: [
          "10 kali (karena 2^10 = 1024)",
          "512 kali",
          "1024 kali",
          "100 kali",
        ],
        correctIndex: 0,
        explanation:
          "Pada Binary Search, setiap langkah membagi data menjadi 2 bagian. log2(1024) = 10 langkah maksimal! Sungguh luar biasa efisien dibanding linear search.",
        points: 20,
      },
      {
        id: 304,
        pillar: "pola",
        scenario:
          "Perhatikan pola bilangan Fibonacci: 1, 1, 2, 3, 5, 8, 13, X. Di mana setiap angka adalah penjumlahan dari dua angka sebelumnya.",
        question: "Berapakah nilai X selanjutnya?",
        options: ["21", "20", "19", "25"],
        correctIndex: 0,
        explanation:
          "Pola Fibonacci: 8 + 13 = 21. Ini adalah contoh pengenalan pola keteraturan rekursif.",
        points: 20,
      },
      {
        id: 305,
        pillar: "dekomposisi",
        scenario:
          "Google Maps ingin menghitung rute perjalanan mobil dari Jakarta ke Surabaya. Masalah ini didekomposisi menjadi perhitungan antar gerbang tol di sepanjang jalan tol Trans Jawa.",
        question:
          "Apa keuntungan melakukan dekomposisi tersebut dibanding menghitung seluruh meter jalan raya secara serentak?",
        options: [
          "Bisa menghitung estimasi waktu dan tarif tol per segmen secara modular dan akurat",
          "Membuat perjalanan mobil terasa lebih lambat",
          "Menghilangkan peta pulau Jawa",
          "Tidak ada keuntungannya",
        ],
        correctIndex: 0,
        explanation:
          "Dengan membagi rute per segmen gerbang tol, sistem dapat menghitung biaya tarif tol, kepadatan lalu lintas parsial, dan rute alternatif dengan sangat cepat dan modular.",
        points: 20,
      },
    ],
    simulatorType: "sorting",
    simulatorTitle: "Arena Simulasi: Tebak Biner & Urutkan Kartu Data",
    simulatorSubtitle: "Terapkan Divide & Conquer untuk menebak angka rahasia serta urutkan data secara efisien!",
  },
];
