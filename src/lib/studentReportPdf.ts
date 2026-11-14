import { KOP_SURAT_BASE64 } from "../kopSuratBase64";

export interface StudentRaporGradeItem {
  title: string;
  type: string;
  bab?: string;
  tanggal?: string;
  nilai: number;
}

export interface StudentRaporAttendanceStats {
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  dispen: number;
  total: number;
  persentase: number;
}

export interface StudentRaporParams {
  student: {
    displayName?: string;
    studentName?: string;
    name?: string;
    nisn?: string;
    nis?: string;
    kelas?: string;
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
  rubric?: {
    kehadiran: number;
    tugas: number;
    uts: number;
    uas: number;
  };
  attendanceStats: StudentRaporAttendanceStats;
  gradeItems: StudentRaporGradeItem[];
  componentScores?: {
    nilaiKehadiran: number;
    avgTugas: number;
    nilaiUts: number;
    nilaiUas: number;
  };
  finalRaporScore: number;
  kkm?: number;
}

export function getGradePredikat(score: number): { code: string; label: string } {
  if (score >= 92) return { code: "A", label: "Sangat Baik" };
  if (score >= 84) return { code: "B", label: "Baik" };
  if (score >= 75) return { code: "C", label: "Cukup / Tuntas" };
  return { code: "D", label: "Perlu Bimbingan" };
}

export function buildParentWaReportText(params: {
  student: any;
  attendanceStats: { Hadir: number; Sakit: number; Izin: number; Alpa: number; Dispen: number };
  totalMeetings: number;
  percentage: number | string;
  gradeItems: { title: string; type: string; nilai: string | number }[];
  ipk: string;
  nilaiRapor?: number;
  kkm?: number;
  subjectName?: string;
}): string {
  const {
    student,
    attendanceStats,
    totalMeetings,
    percentage,
    gradeItems,
    ipk,
    nilaiRapor,
    kkm = 75,
    subjectName = "Informatika",
  } = params;

  const studentName = student.displayName || student.studentName || student.name || "-";
  const gradesReport =
    gradeItems.length > 0
      ? gradeItems.map((g) => `• ${g.type} - ${g.title}: *${g.nilai}*`).join("\n")
      : "- Belum ada entri nilai tugas atau ujian";

  const raporSection =
    nilaiRapor !== undefined
      ? `\n• *Estimasi Nilai Rapor Akhir:* *${nilaiRapor}* (${nilaiRapor >= kkm ? "TUNTAS ✅" : "BELUM TUNTAS ⚠️"} | KKM ${kkm})`
      : "";

  return `*LAPORAN PERKEMBANGAN BELAJAR SISWA*
*SiPinter App — SMAN 1 Cililin*
*Mata Pelajaran: ${subjectName}*

Disampaikan Kepada Yth. Bapak/Ibu Orang Tua/Wali dari:
• *Nama Siswa:* ${studentName}
• *NIS:* ${student.nisn || student.nis || "-"}
• *Kelas:* ${student.kelas || "-"}

*1. RINGKASAN KEHADIRAN (PRESENSI)*
• Total Pertemuan: ${totalMeetings} Pertemuan
• Hadir: ${attendanceStats.Hadir} | Dispen: ${attendanceStats.Dispen}
• Sakit: ${attendanceStats.Sakit} | Izin: ${attendanceStats.Izin} | Alpa: ${attendanceStats.Alpa}
• *Persentase Kehadiran:* *${percentage}%*

*2. DETAIL NILAI TUGAS & UJIAN (CBT)*
${gradesReport}

• *Rata-Rata Nilai Evaluasi:* *${ipk}*${raporSection}

_Ringkasan ini dikirim otomatis melalui sistem SiPinter SMAN 1 Cililin agar Orang Tua/Wali dapat memantau perkembangan belajar Ananda secara berkala._`;
}

async function addKopSurat(doc: any, pageWidth: number, margin: number): Promise<number> {
  try {
    const imgWidth = 1450;
    const imgHeight = 341;
    const targetWidth = pageWidth - margin * 2;
    const targetHeight = (imgHeight / imgWidth) * targetWidth;
    doc.addImage(KOP_SURAT_BASE64, "PNG", margin, 18, targetWidth, targetHeight);
    return 18 + targetHeight + 16;
  } catch {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("PEMERINTAH DAERAH PROVINSI JAWA BARAT", pageWidth / 2, 38, { align: "center" });
    doc.text("DINAS PENDIDIKAN — SMAN 1 CILILIN", pageWidth / 2, 54, { align: "center" });
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Jl. Raya Warungawi, Cililin, Kab. Bandung Barat 40562", pageWidth / 2, 68, { align: "center" });
    doc.setLineWidth(1.5);
    doc.line(margin, 78, pageWidth - margin, 78);
    return 94;
  }
}

export async function generateStudentRaporPdf(params: StudentRaporParams): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = (await import("jspdf-autotable")) as any;

  const doc = new jsPDF("p", "pt", [609.45, 935.43]); // F4 Portrait
  const pageWidth = 609.45;
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const center = pageWidth / 2;

  const settings = {
    subjectName: params.userSettings?.subjectName || "Informatika",
    academicYear: params.userSettings?.academicYear || "2026/2027",
    semester: params.userSettings?.semester || "Ganjil",
    principalName: params.userSettings?.principalName || "Dr. Kepala Sekolah, M.Pd.",
    principalNip: params.userSettings?.principalNip || "-",
    teacherName: params.userSettings?.teacherName || "Agan Parta, S.Kom.",
    teacherNip: params.userSettings?.teacherNip || "-",
  };

  const rubric = params.rubric || { kehadiran: 20, tugas: 50, uts: 10, uas: 20 };
  const kkm = params.kkm ?? 75;
  const studentName =
    params.student.displayName || params.student.studentName || params.student.name || "-";
  const studentNisn = params.student.nisn || params.student.nis || "-";
  const studentKelas = params.student.kelas || "-";
  const isTuntas = params.finalRaporScore >= kkm;
  const predikat = getGradePredikat(params.finalRaporScore);

  let currentY = await addKopSurat(doc, pageWidth, margin);

  // Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text("LAPORAN CAPAIAN HASIL BELAJAR & PRESENSI SISWA", center, currentY, { align: "center" });
  currentY += 14;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Mata Pelajaran: ${settings.subjectName} | Tahun Pelajaran ${settings.academicYear} (${settings.semester})`,
    center,
    currentY,
    { align: "center" }
  );
  currentY += 20;

  // Biodata box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 58, 6, 6, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Nama Siswa", margin + 12, currentY + 18);
  doc.text(":", margin + 92, currentY + 18);
  doc.setFont("Helvetica", "normal");
  doc.text(studentName, margin + 100, currentY + 18);

  doc.setFont("Helvetica", "bold");
  doc.text("NIS / NISN", margin + 12, currentY + 34);
  doc.text(":", margin + 92, currentY + 34);
  doc.setFont("Helvetica", "normal");
  doc.text(String(studentNisn), margin + 100, currentY + 34);

  doc.setFont("Helvetica", "bold");
  doc.text("Kelas", margin + 12, currentY + 50);
  doc.text(":", margin + 92, currentY + 50);
  doc.setFont("Helvetica", "normal");
  doc.text(studentKelas, margin + 100, currentY + 50);

  const rightColX = 335;
  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.setFont("Helvetica", "bold");
  doc.text("KKM Mapel", rightColX, currentY + 18);
  doc.text(":", rightColX + 78, currentY + 18);
  doc.setFont("Helvetica", "normal");
  doc.text(String(kkm), rightColX + 86, currentY + 18);

  doc.setFont("Helvetica", "bold");
  doc.text("Tanggal Cetak", rightColX, currentY + 34);
  doc.text(":", rightColX + 78, currentY + 34);
  doc.setFont("Helvetica", "normal");
  doc.text(todayStr, rightColX + 86, currentY + 34);

  doc.setFont("Helvetica", "bold");
  doc.text("Status Akhir", rightColX, currentY + 50);
  doc.text(":", rightColX + 78, currentY + 50);
  doc.setTextColor(isTuntas ? 22 : 185, isTuntas ? 101 : 28, isTuntas ? 52 : 28);
  doc.text(isTuntas ? "TUNTAS" : "BELUM TUNTAS", rightColX + 86, currentY + 50);

  currentY += 74;

  // Section 1: Presensi
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("A. REKAPITULASI KEHADIRAN (PRESENSI)", margin, currentY);
  currentY += 8;

  const { hadir, sakit, izin, alpa, dispen, total, persentase } = params.attendanceStats;
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Total Pertemuan", "Hadir (H)", "Dispen (D)", "Sakit (S)", "Izin (I)", "Alpa (A)", "Persentase Kehadiran"]],
    body: [[
      `${total} Hari`,
      String(hadir),
      String(dispen),
      String(sakit),
      String(izin),
      String(alpa),
      `${persentase}%`,
    ]],
    theme: "grid",
    styles: {
      font: "Helvetica",
      fontSize: 8.5,
      halign: "center",
      valign: "middle",
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.5,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 6) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = persentase >= 80 ? [220, 252, 231] : [254, 226, 226];
      }
    },
  });

  currentY = ((doc as any).lastAutoTable?.finalY || currentY + 50) + 18;

  // Section 2: Grade Items
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("B. RINCIAN NILAI TUGAS & UJIAN (CBT)", margin, currentY);
  currentY += 8;

  const gradeRows =
    params.gradeItems.length > 0
      ? params.gradeItems.map((item, idx) => {
          const scoreNum = Number(item.nilai) || 0;
          const p = getGradePredikat(scoreNum);
          return [
            String(idx + 1),
            item.title || "-",
            item.type || "-",
            item.bab || "-",
            item.tanggal || "-",
            String(scoreNum),
            `${p.code} (${p.label})`,
          ];
        })
      : [["-", "Belum ada nilai tugas atau ujian yang tercatat", "-", "-", "-", "-", "-"]];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["No", "Nama Evaluasi / Tugas / Ujian", "Jenis", "Bab / Materi", "Tanggal", "Nilai", "Predikat"]],
    body: gradeRows,
    theme: "grid",
    styles: {
      font: "Helvetica",
      fontSize: 8,
      valign: "middle",
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.5,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 26 },
      1: { halign: "left", cellWidth: 165 },
      2: { halign: "center", cellWidth: 52 },
      3: { halign: "left", cellWidth: 95 },
      4: { halign: "center", cellWidth: 68 },
      5: { halign: "center", fontStyle: "bold", cellWidth: 42 },
      6: { halign: "center", cellWidth: 81 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = ((doc as any).lastAutoTable?.finalY || currentY + 80) + 18;

  if (currentY + 230 > pageHeight) {
    doc.addPage();
    currentY = 48;
  }

  // Section 3: Final Report Card Summary Box
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("C. KALKULASI NILAI RAPOR AKHIR (SESUAI RUBRIK)", margin, currentY);
  currentY += 8;

  const comp = params.componentScores || {
    nilaiKehadiran: persentase,
    avgTugas:
      params.gradeItems.length > 0
        ? Math.round(
            params.gradeItems.reduce((sum, g) => sum + (Number(g.nilai) || 0), 0) /
              params.gradeItems.length
          )
        : 0,
    nilaiUts: 0,
    nilaiUas: 0,
  };

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      `Kehadiran (${rubric.kehadiran}%)`,
      `Tugas & Harian (${rubric.tugas}%)`,
      `PTS / UTS (${rubric.uts}%)`,
      `PAS / UAS (${rubric.uas}%)`,
      "NILAI RAPOR AKHIR",
      "PREDIKAT & STATUS",
    ]],
    body: [[
      String(comp.nilaiKehadiran),
      String(comp.avgTugas),
      String(comp.nilaiUts),
      String(comp.nilaiUas),
      String(params.finalRaporScore),
      `${predikat.code} (${isTuntas ? "Tuntas" : "Belum Tuntas"})`,
    ]],
    theme: "grid",
    styles: {
      font: "Helvetica",
      fontSize: 8.5,
      halign: "center",
      valign: "middle",
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.5,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && (data.column.index === 4 || data.column.index === 5)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = isTuntas ? [220, 252, 231] : [254, 226, 226];
      }
    },
  });

  currentY = ((doc as any).lastAutoTable?.finalY || currentY + 50) + 14;

  // Section 4: Evaluation Note
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 46, 5, 5, "FD");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Catatan Guru Mata Pelajaran:", margin + 10, currentY + 15);
  doc.setFont("Helvetica", "normal");
  const evalNote = isTuntas
    ? `Ananda ${studentName} telah menunjukkan capaian belajar yang baik dan melampaui KKM (${kkm}) pada mata pelajaran ${settings.subjectName}. Pertahankan kedisiplinan kehadiran (${persentase}%) dan semangat belajar.`
    : `Ananda ${studentName} perlu bimbingan lanjutan pada beberapa evaluasi yang belum mencapai KKM (${kkm}). Orang tua/wali dimohon mendampingi proses belajar dan penyelesaian tugas di rumah.`;
  const wrappedNote = doc.splitTextToSize(evalNote, pageWidth - margin * 2 - 20);
  doc.text(wrappedNote, margin + 10, currentY + 28);

  currentY += 68;

  if (currentY + 125 > pageHeight) {
    doc.addPage();
    currentY = 60;
  }

  // Signature block
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Mengetahui,", margin, currentY);
  doc.text("Kepala SMAN 1 Cililin,", margin, currentY + 14);
  doc.text(`Cililin, ${todayStr}`, 375, currentY);
  doc.text(`Guru Mata Pelajaran ${settings.subjectName},`, 375, currentY + 14);

  doc.setFont("Helvetica", "bold");
  doc.text(settings.principalName, margin, currentY + 72);
  doc.text(settings.teacherName, 375, currentY + 72);

  doc.setFont("Helvetica", "normal");
  doc.text(`NIP. ${settings.principalNip}`, margin, currentY + 85);
  doc.text(`NIP. ${settings.teacherNip}`, 375, currentY + 85);

  const safeName = studentName.replace(/[^a-zA-Z0-9_-]+/g, "_");
  doc.save(`Rapor_${safeName}_${studentKelas.replace(/\s+/g, "_")}.pdf`);
}
