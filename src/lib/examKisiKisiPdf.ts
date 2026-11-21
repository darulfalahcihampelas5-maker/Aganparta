export interface KisiKisiQuestionInput {
  type?: string;
  text?: string;
  options?: string[];
  correctIndex?: number;
  correctAnswerText?: string;
  indikator?: string;
  lingkupMateri?: string;
  levelKognitif?: string;
  bab?: string;
}

export interface GenerateExamKisiKisiPdfParams {
  exam: {
    id?: string;
    title?: string;
    subject?: string;
    bab?: string;
    tema?: string;
    materi?: string;
    kelasRef?: string;
    targetClasses?: string[];
    duration?: number;
    kkm?: number;
    description?: string;
    questions?: KisiKisiQuestionInput[];
  };
  userSettings?: {
    subjectName?: string;
    academicYear?: string;
    semester?: string;
    principalName?: string;
    principalNip?: string;
    teacherName?: string;
    teacherNip?: string;
  };
}

function getQuestionTypeLabel(qType?: string): string {
  if (qType === "short_answer") return "Isian Singkat";
  if (qType === "essay") return "Uraian / Esai";
  return "Pilihan Ganda";
}

function inferCognitiveLevel(q: KisiKisiQuestionInput): string {
  if (q.levelKognitif && q.levelKognitif.trim()) {
    return q.levelKognitif.trim();
  }
  const lower = String(q.text || "").toLowerCase();
  if (
    lower.includes("mengapa") ||
    lower.includes("evaluasi") ||
    lower.includes("analisis") ||
    lower.includes("bandingkan") ||
    lower.includes("kesimpulan") ||
    lower.includes("studi kasus") ||
    lower.includes("simpulkan") ||
    q.type === "essay"
  ) {
    return "L3 (Penalaran)";
  }
  if (
    lower.includes("bagaimana") ||
    lower.includes("langkah") ||
    lower.includes("urutan") ||
    lower.includes("hitung") ||
    lower.includes("terapkan") ||
    lower.includes("output") ||
    lower.includes("hasil")
  ) {
    return "L2 (Penerapan)";
  }
  return "L1 (Pemahaman)";
}

function detectCompetencyTheme(questionText: string, topicScope: string): string {
  const lower = questionText.toLowerCase();

  const domainRules: Array<{ pattern: RegExp; theme: string }> = [
    { pattern: /\b(biner|desimal|oktal|heksadesimal|konversi\s+bilangan|bit|byte)\b/, theme: "sistem bilangan dan konversi data" },
    { pattern: /\b(algoritma|flowchart|diagram\s+alir|pseudocode|logika|percabangan|if\s*-?\s*else|perulangan|loop|rekursi|fungsi)\b/, theme: "algoritma dan alur logika pemrograman" },
    { pattern: /\b(sort|sorting|bubble|insertion|selection|search|pencarian|antrean|queue|tumpukan|stack|graf|tree|pohon)\b/, theme: "struktur data dan algoritma pencarian" },
    { pattern: /\b(dekomposisi|pengenalan\s+pola|abstraksi|berpikir\s+komputasional|computational)\b/, theme: "pilar berpikir komputasional" },
    { pattern: /\b(cpu|processor|ram|rom|harddisk|ssd|motherboard|input|output|perangkat\s+keras|hardware|memori|alu|cu)\b/, theme: "komponen perangkat keras komputer" },
    { pattern: /\b(sistem\s+operasi|os|aplikasi|perangkat\s+lunak|software|driver|open\s+source|lisensi)\b/, theme: "sistem operasi dan perangkat lunak" },
    { pattern: /\b(jaringan|lan|wan|man|internet|ip\s+address|dns|router|switch|topologi|wifi|protokol|tcp|http|kabel|nirkabel)\b/, theme: "jaringan komputer dan internet" },
    { pattern: /\b(keamanan|enkripsi|phishing|malware|password|autentikasi|privasi|jejak\s+digital|etika|hoaks|hak\s+cipta|cyber|siber)\b/, theme: "keamanan dan etika digital" },
    { pattern: /\b(data|excel|spreadsheet|tabel|grafik|visualisasi|rumus|formula|sum|average|vlookup|pivot|csv|analisis\s+data)\b/, theme: "pengolahan dan analisis data" },
    { pattern: /\b(ai|kecerdasan\s+artifisial|buatan|machine\s+learning|prompt|otomatisasi)\b/, theme: "pemanfaatan kecerdasan artifisial" },
    { pattern: /\b(kolaborasi|presentasi|dokumen|cloud|google\s+drive|email|tik|komunikasi\s+daring|infografis|literasi\s+digital)\b/, theme: "aplikasi perkantoran dan kolaborasi digital" },
    { pattern: /\b(dampak\s+sosial|profesi|karier|industri|masyarakat\s+digital|transformasi\s+digital)\b/, theme: "dampak sosial informatika" },
    { pattern: /\b(proyek|lintas\s+bidang|tim|perencanaan|pengujian|dokumentasi|desain\s+solusi)\b/, theme: "proyek informatika lintas bidang" },
  ];

  for (const rule of domainRules) {
    if (rule.pattern.test(lower)) {
      return rule.theme;
    }
  }

  const cleanTopic = topicScope
    .replace(/^Bab\s*\d+\s*:\s*/i, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();
  return cleanTopic ? cleanTopic.toLowerCase() : "konsep dasar informatika";
}

export function stripBabAndLingkupFromKisiTitle(rawTitle: string): string {
  const base = String(rawTitle || "").trim();
  if (!base) return "Evaluasi Pembelajaran";

  const stripped = base
    .replace(/\s*[-–—|•:]\s*(?:Bab|Lingkup(?:\s+Materi)?|Gabungan\s+Materi)\b.*$/i, "")
    .replace(/\s*\((?:Bab|Lingkup|Gabungan\s+Materi)[^)]*\)\s*/gi, " ")
    .replace(/\s+(?:Bab\s+\d+\s*:?.*|Bab\s*\/\s*Lingkup.*)$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[-–—:|•]\s*$/, "")
    .trim();

  return stripped || base;
}

function extractCorrectAnswerSnippet(q: KisiKisiQuestionInput): string {
  if (q.type !== "short_answer" && q.type !== "essay" && Array.isArray(q.options)) {
    const idx = typeof q.correctIndex === "number" ? q.correctIndex : 0;
    const picked = String(q.options[idx] || "").trim();
    if (picked && !/^(pilihan|opsi)\s+[a-e]$/i.test(picked)) {
      const cleaned = picked.replace(/\s+/g, " ").replace(/[.]+$/, "");
      return cleaned.length > 180 ? `${cleaned.slice(0, 177)}...` : cleaned;
    }
  }
  const rawAnsText = String(q.correctAnswerText || "").trim();
  if (rawAnsText) {
    const firstVariant = rawAnsText.split("|")[0].trim().replace(/\s+/g, " ").replace(/[.]+$/, "");
    if (firstVariant) {
      return firstVariant.length > 180 ? `${firstVariant.slice(0, 177)}...` : firstVariant;
    }
  }
  return "";
}

function extractQuestionCoreFocus(rawText: string): string {
  let focus = String(rawText || "")
    .replace(/\s+/g, " ")
    .replace(/^Perhatikan\s+(?:pernyataan|gambar|tabel|cuplikan|kasus|teks|data|kode|algoritma)\s+(?:berikut(?:\s+ini)?|di\s+(?:samping|bawah|atas))?[!.:,\s]*/i, "")
    .replace(/^Bacalah\s+(?:teks|pernyataan|kasus|kutipan)\s+berikut(?:\s+ini)?[!.:,\s]*/i, "")
    .replace(/^(?:Pada\s+(?:gambar|tabel|ilustrasi|kasus|kode)\s+di\s+(?:samping|atas|bawah)[,\s]*)/i, "")
    .replace(/^(?:Dari\s+pernyataan|Berdasarkan\s+(?:teks|pernyataan|kasus|data|gambar|tabel))\s+di\s+(?:atas|bawah|samping)[,\s]*/i, "")
    .replace(/^(?:Manakah\s+(?:di\s+bawah\s+ini|berikut(?:\s+ini)?)\s+yang|Berikut(?:\s+ini)?\s+(?:adalah|merupakan|yang)|Di\s+bawah\s+ini\s+yang)\s+/i, "")
    .replace(/^(?:Apakah\s+yang\s+dimaksud\s+dengan|Apa\s+yang\s+dimaksud\s+dengan|Yang\s+dimaksud\s+dengan)\s+/i, "")
    .replace(/^(?:Apakah|Apa|Mengapa|Kenapa|Bagaimana|Berapakah|Berapa|Sebutkan|Jelaskan|Tentukan|Hitunglah|Carilah|Identifikasilah|Analisislah)\s+/i, "")
    .replace(/\s*(?:\.{2,}|_{2,}|\?+|!+)\s*$/g, "")
    .replace(/\s+(?:adalah|merupakan|disebut(?:\s+juga)?(?:\s+sebagai)?|yaitu|yakni|antara\s+lain|sebagai\s+berikut|kecuali)\s*$/i, "")
    .trim();

  if (focus.length > 105) {
    const cut = focus.slice(0, 102);
    const lastSpace = cut.lastIndexOf(" ");
    focus = (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim();
  }

  // Lowercase first word unless it's an uppercase acronym (e.g., CPU, RAM, LAN, IP, HTML)
  if (/^[A-Z][a-z]/.test(focus)) {
    focus = focus.charAt(0).toLowerCase() + focus.slice(1);
  }
  return focus;
}

function synthesizeIndicator(q: KisiKisiQuestionInput, examMateri: string, fallbackTopic: string): string {
  if (q.indikator && q.indikator.trim()) {
    const cleaned = q.indikator.trim().replace(/^["']|["']$/g, "").replace(/\?+$/, "");
    const isOldTemplate =
      cleaned.endsWith("sesuai tujuan pembelajaran yang diukur") ||
      cleaned.includes('menyimpulkan ketepatan "') ||
      cleaned.includes('mengarah pada "') ||
      cleaned.includes('mengacu pada "') ||
      cleaned.includes('secara tepat konsep "');
    if (cleaned.length >= 18 && !isOldTemplate) {
      return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
    }
  }

  const rawText = String(q.text || "").replace(/\s+/g, " ").trim();
  const level = inferCognitiveLevel(q);
  const topicScope = examMateri || q.bab || fallbackTopic || "Informatika";
  const theme = detectCompetencyTheme(rawText, topicScope);
  const lower = rawText.toLowerCase();
  const coreFocus = extractQuestionCoreFocus(rawText);
  const materiSuffix =
    examMateri && !coreFocus.toLowerCase().includes(examMateri.toLowerCase())
      ? ` pada materi ${examMateri}`
      : "";

  if (coreFocus && coreFocus.length >= 10) {
    if (/\b(kecuali|bukan\s+termasuk|tidak\s+termasuk|bukan\s+merupakan)\b/.test(lower)) {
      return `Peserta didik mampu membedakan hal yang bukan termasuk dalam ${coreFocus}${materiSuffix}.`;
    }
    if (/\b(mengapa|kenapa|alasan|sebab)\b/.test(lower)) {
      return `Peserta didik mampu menjelaskan alasan secara tepat mengenai ${coreFocus}${materiSuffix}.`;
    }
    if (/\b(perbedaan|membedakan|bandingkan|berbeda)\b/.test(lower)) {
      return `Peserta didik mampu membedakan karakteristik ${coreFocus}${materiSuffix}.`;
    }
    if (/\b(hitung|konversi|konversikan|output|hasilnya|berapa|berapakah|nilai\s+dari|rumus|formula)\b/.test(lower)) {
      return `Peserta didik mampu menghitung dan menentukan hasil yang benar untuk ${coreFocus}${materiSuffix}.`;
    }
    if (/\b(urutan|langkah|tahapan|prosedur)\b/.test(lower)) {
      return `Peserta didik mampu menentukan urutan langkah kerja yang benar terkait ${coreFocus}${materiSuffix}.`;
    }
    if (/\b(fungsi|kegunaan|manfaat|peran|bertugas|tujuan)\b/.test(lower)) {
      return `Peserta didik mampu menjelaskan fungsi dan peran ${coreFocus}${materiSuffix}.`;
    }
    if (/\b(cara|bagaimana|solusi|mencegah|mengatasi|langkah\s+pencegahan)\b/.test(lower)) {
      return `Peserta didik mampu menentukan cara atau solusi yang tepat untuk ${coreFocus}${materiSuffix}.`;
    }
    if (/\b(dampak|akibat|pengaruh)\b/.test(lower)) {
      return `Peserta didik mampu menganalisis dampak dari ${coreFocus}${materiSuffix}.`;
    }
    if (/\b(contoh|termasuk|komponen|bagian|jenis|macam|perangkat)\b/.test(lower)) {
      return `Peserta didik mampu mengidentifikasi ${coreFocus}${materiSuffix}.`;
    }
    if (/\b(pengertian|yang\s+dimaksud|definisi|disebut|adalah|merupakan)\b/.test(lower)) {
      return `Peserta didik mampu memahami dan menjelaskan pengertian ${coreFocus}${materiSuffix}.`;
    }
    if (level.startsWith("L3")) {
      return `Peserta didik mampu menganalisis konteks permasalahan mengenai ${coreFocus}${materiSuffix}.`;
    }
    return `Peserta didik mampu memahami konsep serta menentukan penyelesaian mengenai ${coreFocus}${materiSuffix}.`;
  }

  return `Peserta didik mampu memahami dan menerapkan konsep ${theme}${materiSuffix}.`;
}

function capitalizePhrase(text: string): string {
  const clean = String(text || "").trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function resolveLingkupMateriScope(
  q: KisiKisiQuestionInput,
  examMateri: string,
  fallbackSubject: string
): string {
  const ansSnippet = extractCorrectAnswerSnippet(q).toLowerCase();
  const rawLingkup = String(q.lingkupMateri || "").trim();
  const cleanExamMateri = String(examMateri || "").trim();

  // Gunakan q.lingkupMateri jika cukup lengkap, jelas, dan TIDAK membocorkan teks jawaban benar
  if (rawLingkup) {
    const rawLower = rawLingkup.replace(/[.]+$/, "").toLowerCase();
    const isCopyingAnswer =
      Boolean(ansSnippet) &&
      (rawLower === ansSnippet ||
        (rawLower.length >= 8 && ansSnippet.includes(rawLower)) ||
        (ansSnippet.length >= 8 && rawLower.includes(ansSnippet)));

    if (!isCopyingAnswer && rawLingkup.length >= 12) {
      if (
        cleanExamMateri &&
        !rawLower.includes(cleanExamMateri.toLowerCase()) &&
        rawLingkup.split(/\s+/).length <= 4
      ) {
        return `${cleanExamMateri}: ${rawLingkup}`;
      }
      return rawLingkup;
    }
  }

  const rawText = String(q.text || "").replace(/\s+/g, " ").trim();
  const topicScope = cleanExamMateri || q.bab || fallbackSubject || "Informatika";
  const detectedTheme = capitalizePhrase(detectCompetencyTheme(rawText, topicScope));

  if (cleanExamMateri && detectedTheme && !detectedTheme.toLowerCase().includes(cleanExamMateri.toLowerCase())) {
    return `${cleanExamMateri}: ${detectedTheme}`;
  }
  if (cleanExamMateri) {
    return cleanExamMateri;
  }
  if (detectedTheme) {
    return detectedTheme;
  }

  return q.bab || fallbackSubject || "Informatika Fase E";
}

async function addKopSuratHeader(doc: any, pageWidth: number, margin = 40): Promise<number> {
  try {
    const { KOP_SURAT_BASE64 } = await import("../kopSuratBase64");
    const targetWidth = pageWidth - margin * 2;
    const targetHeight = targetWidth * (341 / 1450);
    doc.addImage(KOP_SURAT_BASE64, "PNG", margin, 20, targetWidth, targetHeight);
    return 20 + targetHeight + 14;
  } catch (e) {
    console.warn("Kop Surat fallback triggered:", e);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text("PEMERINTAH DAERAH PROVINSI JAWA BARAT", pageWidth / 2, 42, { align: "center" });
    doc.setFontSize(12);
    doc.text("DINAS PENDIDIKAN", pageWidth / 2, 56, { align: "center" });
    doc.setFontSize(10);
    doc.text("CABANG DINAS PENDIDIKAN WILAYAH VI", pageWidth / 2, 69, { align: "center" });
    doc.setFontSize(15);
    doc.text("SMA NEGERI 1 CILILIN", pageWidth / 2, 86, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Jl. Raya Cililin No. 39, Kec. Cililin, Kabupaten Bandung Barat 40562", pageWidth / 2, 98, { align: "center" });
    doc.setFont("Helvetica", "italic");
    doc.text("Website: https://www.sman1cililin.sch.id | Email: sman1cln@yahoo.co.id", pageWidth / 2, 109, { align: "center" });

    doc.setLineWidth(2.0);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, 122, pageWidth - margin, 122);
    doc.setLineWidth(0.5);
    doc.line(margin, 126, pageWidth - margin, 126);
    return 146;
  }
}

export async function generateExamKisiKisiPdf({
  exam,
  userSettings,
}: GenerateExamKisiKisiPdfParams): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = (await import("jspdf-autotable")) as any;

  // F4 size in points
  const doc = new jsPDF("p", "pt", [609.45, 935.43]);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  let currentY = await addKopSuratHeader(doc, pageWidth, margin);

  const subjectName = exam.subject || userSettings?.subjectName || "Informatika";
  const academicYear = userSettings?.academicYear || "2026/2027";
  const semester = userSettings?.semester || "Ganjil";
  const teacherName = userSettings?.teacherName || "Agan Parta, S.Kom.";
  const teacherNip = userSettings?.teacherNip || "-";
  const principalName = userSettings?.principalName || "Dr. H. Contoh Kepala, M.Pd.";
  const principalNip = userSettings?.principalNip || "-";

  const questions = Array.isArray(exam.questions) ? exam.questions : [];
  const rawExamTitle = exam.title || "Evaluasi Pembelajaran";
  const examTema = exam.tema || "Penilaian / Ujian";
  const examMateriClean = String(exam.materi || "").trim();
  const formattedPdfTitle = stripBabAndLingkupFromKisiTitle(rawExamTitle);
  const kelasLabel =
    exam.kelasRef === "SEMUA_KELAS"
      ? "Semua Kelas X"
      : exam.kelasRef || (Array.isArray(exam.targetClasses) ? exam.targetClasses.join(", ") : "Kelas X");
  const durationMinutes = Math.max(1, Math.round((Number(exam.duration) || 1800) / 60));
  const kkm = Number(exam.kkm) || 75;
  const todayFormattedHeader = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  // Title Block
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text("KISI-KISI PENULISAN SOAL PENILAIAN", pageWidth / 2, currentY + 6, { align: "center" });

  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);
  const wrappedTitle = doc.splitTextToSize(formattedPdfTitle.toUpperCase(), pageWidth - margin * 2);
  doc.text(wrappedTitle, pageWidth / 2, currentY + 21, { align: "center" });

  currentY += 24 + wrappedTitle.length * 12;

  const identityBody: string[][] = [
    ["Satuan Pendidikan", ": SMA Negeri 1 Cililin", "Tahun Ajaran / Smt", `: ${academicYear} (${semester})`],
    ["Mata Pelajaran", `: ${subjectName}`, "Jenis Penilaian", `: ${examTema}`],
    ["Kelas / Sasaran", `: ${kelasLabel}`, "Jumlah / Durasi", `: ${questions.length} Soal / ${durationMinutes} Menit`],
  ];
  if (examMateriClean) {
    identityBody.push(["Materi Uji", `: ${examMateriClean}`, "Guru Mapel / KKM", `: ${teacherName} (KKM ${kkm})`]);
  } else {
    identityBody.push(["Guru Mata Pelajaran", `: ${teacherName}`, "KKM / Tanggal Cetak", `: ${kkm} / ${todayFormattedHeader}`]);
  }

  // Identity Table (tanpa baris Bab / Lingkup sesuai permintaan)
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: {
      font: "Helvetica",
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 105 },
      1: { cellWidth: 155 },
      2: { fontStyle: "bold", cellWidth: 105 },
      3: { cellWidth: "auto" },
    },
    body: identityBody,
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  const fallbackTopic = examMateriClean || exam.bab || subjectName || "Informatika";
  const tableRows =
    questions.length > 0
      ? questions.map((q, idx) => {
          const indicatorText = synthesizeIndicator(q, examMateriClean, fallbackTopic);
          const lingkupMateri = resolveLingkupMateriScope(q, examMateriClean, fallbackTopic);
          return [
            String(idx + 1),
            lingkupMateri,
            indicatorText,
            getQuestionTypeLabel(q.type),
            inferCognitiveLevel(q),
            String(idx + 1),
          ];
        })
      : [
          [
            "1",
            fallbackTopic,
            `Peserta didik mampu memahami dan menerapkan konsep pokok pada materi ${fallbackTopic}.`,
            "Pilihan Ganda",
            "L1–L3",
            "1",
          ],
        ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["No", "Ruang Lingkup Materi", "Tujuan Indikator Pencapaian Kompetensi", "Bentuk Soal", "Level", "No. Soal"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      valign: "middle",
    },
    styles: {
      font: "Helvetica",
      fontSize: 8.2,
      cellPadding: 5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.5,
      valign: "top",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 28 },
      1: { cellWidth: 105 },
      2: { cellWidth: "auto" },
      3: { halign: "center", cellWidth: 68 },
      4: { halign: "center", cellWidth: 64 },
      5: { halign: "center", cellWidth: 42 },
    },
  });

  // Signature Section
  let sigY = ((doc as any).lastAutoTable?.finalY || currentY) + 26;
  if (sigY + 115 > pageHeight - 35) {
    doc.addPage();
    sigY = 60;
  }

  const todayFormatted = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  doc.text("Mengetahui,", margin, sigY);
  doc.text("Kepala SMA Negeri 1 Cililin", margin, sigY + 13);

  doc.text(`Cililin, ${todayFormatted}`, 375, sigY);
  doc.text(`Guru Mata Pelajaran ${subjectName},`, 375, sigY + 13);

  doc.setFont("Helvetica", "bold");
  doc.text(principalName, margin, sigY + 70);
  doc.text(teacherName, 375, sigY + 70);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`NIP. ${principalNip}`, margin, sigY + 83);
  doc.text(`NIP. ${teacherNip}`, 375, sigY + 83);

  const safeFilename = formattedPdfTitle
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  doc.save(`Kisi-Kisi_${safeFilename || "Ujian"}.pdf`);
}
