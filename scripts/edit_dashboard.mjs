import fs from "fs";

let content = fs.readFileSync("src/pages/DashboardStudent.tsx", "utf8");

// 1. Remove Google Drive rules
content = content.replace(
  /\{\/\* Google Drive Link Rules \*\/\}.*?\{\/\* Umum \*\/\}/s,
  `{/* Umum */}`
);

// 2. Remove Mode Switcher tabs
content = content.replace(
  /\{\/\* Mode Switcher Tabs \*\/\}.*?\{\/\* Body \*\/\}/s,
  `{/* Body */}`
);

// 3. Remove "TAB 1: PINDAI" label
content = content.replace(
  /\{\/\* TAB 1: PINDAI \/ FOTO CATATAN MULTI-LEMBAR -> AUTO PDF \*\/\}\s*\{submissionTab === "scan" && \(/s,
  `{/* FOTO CATATAN MULTI-LEMBAR -> AUTO PDF */}\n              {true && (`
);

// 4. Remove Link tab block
content = content.replace(
  /\{\/\* TAB 2: LINK TAUTAN \*\/\}.*?\{\/\* Submit & Cancel Action Buttons \*\/\}/s,
  `{/* Submit & Cancel Action Buttons */}`
);

// 5. Update Submit Button label
content = content.replace(
  /<span>\s*\{submissionTab === "scan".*?: "Kirim Tautan Tugas"\}\s*<\/span>/s,
  `<span>Kirim {scannedPages.length > 0 ? \`(\${scannedPages.length} Lembar PDF)\` : "Tugas PDF"}</span>`
);

// 6. Update the submit logic
const submitRegex = /\{\/\* Submit Button handles both PDF Scan mode and Link mode \*\/\}.*?catch \(error: any\) \{/s;

const submitReplacement = `{/* Submit Button handles PDF Scan mode */}
              <button
                type="button"
                disabled={isUploading || isProcessingScan || scannedPages.length === 0}
                onClick={async () => {
                    if (scannedPages.length === 0) {
                      setUploadMessage({
                        text: "Harap ambil foto / pindai minimal 1 lembar catatan tugas terlebih dahulu.",
                        type: "error",
                      });
                      return;
                    }
                    if (!selectedTugas) return;

                    setIsUploading(true);
                    setUploadProgress(20);
                    setUploadMessage({ text: "Mengonversi seluruh lembar catatan menjadi 1 file PDF...", type: "warning" });

                    try {
                      // Generate multi-page PDF using jsPDF
                      const pdfDoc = new jsPDF({
                        orientation: "portrait",
                        unit: "mm",
                        format: "a4",
                      });
                      const pageWidth = 210;
                      const pageHeight = 297;
                      const margin = 10;
                      const maxW = pageWidth - margin * 2;
                      const maxH = pageHeight - margin * 2;

                      for (let i = 0; i < scannedPages.length; i++) {
                        if (i > 0) {
                          pdfDoc.addPage();
                        }
                        const imgData = scannedPages[i];
                        await new Promise<void>((resolve) => {
                          const img = new Image();
                          img.onload = () => {
                            let renderW = maxW;
                            let renderH = (img.height * renderW) / img.width;
                            if (renderH > maxH) {
                              renderH = maxH;
                              renderW = (img.width * renderH) / img.height;
                            }
                            const posX = margin + (maxW - renderW) / 2;
                            const posY = margin + (maxH - renderH) / 2;
                            pdfDoc.addImage(imgData, "JPEG", posX, posY, renderW, renderH, undefined, "FAST");
                            
                            pdfDoc.setFontSize(9);
                            pdfDoc.setTextColor(120, 120, 120);
                            pdfDoc.text(
                              \`Halaman \${i + 1} dari \${scannedPages.length} • Catatan Tugas Siswa: \${selectedTugas.materi || "Tugas"} • SiPinter Apps\`,
                              pageWidth / 2,
                              pageHeight - 5,
                              { align: "center" }
                            );
                            resolve();
                          };
                          img.onerror = () => resolve();
                          img.src = imgData;
                        });
                      }

                      setUploadProgress(60);
                      setUploadMessage({ text: "Mengunggah berkas PDF ke penyimpanan awan...", type: "warning" });

                      const submissionId = \`SUB-\${student.nisn}-\${selectedTugas.id}\`;
                      const pdfBlob = pdfDoc.output("blob");
                      
                      // Upload to Firebase Storage
                      const storageRef = ref(storage, \`submissions/\${student.nisn}/\${submissionId}_\${Date.now()}.pdf\`);
                      await uploadBytes(storageRef, pdfBlob);
                      const pdfDownloadUrl = await getDownloadURL(storageRef);

                      setUploadProgress(85);
                      setUploadMessage({ text: "Menyimpan data tugas ke database...", type: "warning" });

                      const existingSub = submissionsList.find((s: any) => s.id === submissionId);
                      const initialSubmittedAt = existingSub?.submittedAt || existingSub?.createdAt || new Date().toISOString();
                      const nowIso = new Date().toISOString();
                      const isPerbaikan = !!existingSub && (existingSub.status === "ditolak" || existingSub.wasRejected === true || !!existingSub.keterangan);
                      const cleanName = (student.name || student.displayName || "Siswa").replace(/[^a-zA-Z0-9]/g, "_");

                      const newSubmissionObj = {
                        id: submissionId,
                        assignmentId: selectedTugas.id,
                        nisn: student.nisn,
                        studentName: student.name || student.displayName || "Siswa",
                        kelas: student.kelas || null,
                        fileName: \`Catatan_\${cleanName}_\${scannedPages.length}Lembar.pdf\`,
                        fileUrl: pdfDownloadUrl,
                        pageCount: scannedPages.length,
                        isPdfScan: true,
                        submittedAt: initialSubmittedAt,
                        updatedAt: nowIso,
                        resubmittedAt: isPerbaikan ? nowIso : null,
                        wasRejected: isPerbaikan || existingSub?.wasRejected || false,
                        status: "menunggu penilaian guru",
                      };

                      try {
                        mutateSubmissions([...submissionsList.filter((s: any) => s.id !== submissionId), newSubmissionObj], false);
                      } catch (e) {
                        console.warn("Optimistic update error:", e);
                      }

                      await setDoc(
                        doc(db, "submissions", submissionId),
                        newSubmissionObj,
                        { merge: true },
                      );

                      setSuccessTugasMateri(selectedTugas?.materi || "Materi Pelajaran");
                      setUploadProgress(100);
                      trackUsage(0, 1);
                      mutateSubmissions();

                      setIsUploadModalOpen(false);
                      setShowSuccessOverlay(true);
                      setScannedPages([]);
                      setUploadMessage(null);
                      setUploadProgress(0);
                      setSelectedFile("");

                    } catch (error: any) {`;

content = content.replace(submitRegex, submitReplacement);

fs.writeFileSync("src/pages/DashboardStudent.tsx", content, "utf8");
