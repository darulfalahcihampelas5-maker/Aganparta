import "dotenv/config";
import express from "express";
// Process-level robust crash prevention
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Process Server] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Process Server] Uncaught Exception thrown:", error);
});

import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import multer from 'multer';
import {
  buildCompactSystemInstruction,
  extractFirstName,
  formatFriendlyGeminiError,
  getGeminiModelConfigs,
  getSharedCachedReply,
  isLiveStudentContextQuestion,
  isRetryableGeminiError,
  matchLocalKnowledge,
  normalizeGeminiTurns,
  runWithGeminiQueue,
  sanitizeSipinterContext,
  setSharedCachedReply,
  streamTextViaSse,
  checkProfanity,
  getProfanityWarningMessage,
} from "./api/_siPinterEngine.ts";

let db: any = null;
let bucket: any = null;
const inMemoryAiLogs: any[] = [];
const inMemoryAiViolations: any[] = [];
let firestoreApiAvailable = true;
try {
  initializeApp({
    storageBucket: "gen-lang-client-0391947162.firebasestorage.app"
  });
  try { db = getFirestore(); } catch (e) { console.warn("[Firestore Admin] init error:", e); }
  try { bucket = getStorage().bucket(); } catch (e) { console.warn("[Storage Admin] init error:", e); }
} catch (e) {
  console.warn("[Firebase Admin] Initialization skipped or error:", e);
}
const upload = multer({ storage: multer.memoryStorage() });

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  // Use gemini-4-hydrogen as default, fallback to gemini-3.1-flash-lite if rate-limited or busy
  const models = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`[Gemini Engine] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model: model,
        contents: params.contents,
        config: params.config,
      });
      if (response && response.text) {
        console.log(`[Gemini Engine] Success using model: ${model}`);
        return response;
      }
      throw new Error(`Model ${model} returned empty response.`);
    } catch (error: any) {
      console.warn(`[Gemini Engine] Failed using model: ${model}. Error: ${error.message || JSON.stringify(error)}`);
      lastError = error;
    }
  }

  const cleanErrorMessage = lastError && lastError.message 
    ? lastError.message 
    : "Kedua model Gemini (4-hydrogen & 3.1-flash-lite) mengalami gangguan atau limit kuota.";
  throw new Error(cleanErrorMessage);
}

async function recordAiChatLog(params: {
  studentName?: string;
  questionText: string;
  durationMs: number;
  flagged?: boolean;
  flaggedWord?: string;
}) {
  try {
    const logItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentName: params.studentName || "Siswa",
      questionText: params.questionText,
      flagged: Boolean(params.flagged),
      ...(params.flaggedWord ? { flaggedWord: params.flaggedWord } : {}),
      durationMs: Math.max(1, Math.round(params.durationMs)),
      timestamp: new Date().toISOString(),
    };
    inMemoryAiLogs.push(logItem);
    if (inMemoryAiLogs.length > 500) {
      inMemoryAiLogs.shift();
    }
    if (db && firestoreApiAvailable) {
      try {
        await db.collection("aiChatLogs").add(logItem);
      } catch (e: any) {
        if (e?.message?.includes("PERMISSION_DENIED") || e?.code === 7) {
          firestoreApiAvailable = false;
        }
      }
    }
  } catch {
    // Non-blocking log
  }
}

// API Route for Gemini Chat (3-Layer Quota-Saving Architecture)
async function handleChatRequest(req: any, res: any) {
  const reqStart = Date.now();
  try {
    const { messages, studentName, sipinterContext, stream, debug, bypassLocal } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    }
    const safeSipinterContext = sanitizeSipinterContext(sipinterContext);

    const firstName = extractFirstName(studentName);
    const assistantName = "Si Pinter";

    const contents = normalizeGeminiTurns(messages);
    if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
      return res.status(400).json({ error: "Pesan tidak berisi teks pertanyaan yang valid." });
    }

    const lastMessage = contents[contents.length - 1];
    const isStandaloneQuestion = contents.length === 1;
    const questionText = lastMessage.parts[0].text;

    // PROFANITY & DIGITAL ETHICS FILTER
    const flaggedWord = checkProfanity(questionText);
    if (flaggedWord) {
      const warningReply = getProfanityWarningMessage(firstName, flaggedWord);
      const durationMs = Date.now() - reqStart;
      try {
        const violationItem = {
          id: `viol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentName: studentName || firstName,
          questionText,
          flaggedWord,
          timestamp: new Date().toISOString(),
          status: "Belum Ditindaklanjuti",
        };
        const logItem = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentName: studentName || firstName,
          questionText,
          flagged: true,
          flaggedWord,
          durationMs,
          timestamp: new Date().toISOString(),
        };

        inMemoryAiViolations.unshift(violationItem);
        inMemoryAiLogs.push(logItem);

        if (db && firestoreApiAvailable) {
          try {
            await db.collection("aiViolations").add(violationItem);
            await db.collection("aiChatLogs").add(logItem);
          } catch (e: any) {
            if (e?.message?.includes("PERMISSION_DENIED") || e?.code === 7) {
              firestoreApiAvailable = false;
            }
          }
        }
      } catch (logErr) {
        // Suppress warning log
      }

      if (stream) {
        return streamTextViaSse(res, warningReply, debug ? { source: "profanity-filter", flaggedWord } : undefined);
      }
      return res.json({ text: warningReply, ...(debug ? { source: "profanity-filter", flaggedWord } : {}) });
    }

    const isLiveContextQuery = Boolean(safeSipinterContext) && isLiveStudentContextQuestion(questionText);

    // LAPIS 1: Local Knowledge Base (App Guides + Informatics Bab 1-9) — 0 Gemini Quota
    if (isStandaloneQuestion && !bypassLocal && !isLiveContextQuery) {
      const localReply = matchLocalKnowledge(questionText, firstName);
      if (localReply) {
        const durationMs = Date.now() - reqStart;
        console.log(`[Chat API Lapis 1 Local Hit] ${durationMs}ms`);
        void recordAiChatLog({ studentName: studentName || firstName, questionText, durationMs });
        if (stream) {
          return streamTextViaSse(res, localReply, debug ? { source: "local", ms: durationMs } : undefined);
        }
        return res.json({ text: localReply, ...(debug ? { source: "local", ms: durationMs } : {}) });
      }
    }

    // LAPIS 2: Cross-Student Shared Cache — 0 Gemini Quota for repeated static questions across all 300 students
    if (isStandaloneQuestion && !isLiveContextQuery) {
      const cachedReply = getSharedCachedReply(questionText, firstName);
      if (cachedReply) {
        const durationMs = Date.now() - reqStart;
        console.log(`[Chat API Lapis 2 Shared Cache Hit] ${durationMs}ms`);
        void recordAiChatLog({ studentName: studentName || firstName, questionText, durationMs });
        if (stream) {
          return streamTextViaSse(res, cachedReply, debug ? { source: "cache", ms: durationMs } : undefined);
        }
        return res.json({ text: cachedReply, ...(debug ? { source: "cache", ms: durationMs } : {}) });
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Kunci API Gemini belum terkonfigurasi di server." });
    }

    const systemInstruction = buildCompactSystemInstruction(firstName, studentName, safeSipinterContext);
    const modelConfigs = getGeminiModelConfigs(systemInstruction);
    const attemptLogs: Array<{ model: string; ms: number; ok: boolean; err?: string }> = [];

    if (stream) {
      // Open SSE stream immediately so browser receives headers in <5ms
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();
      res.write(": stream-open\n\n");

      let clientDisconnected = false;
      res.on("close", () => {
        if (!res.writableEnded) {
          clientDisconnected = true;
        }
      });

      const queueHeartbeat = setInterval(() => {
        if (!clientDisconnected && !res.writableEnded) {
          res.write(": queue-wait\n\n");
        }
      }, 4000);

      try {
        await runWithGeminiQueue(
          async () => {
            clearInterval(queueHeartbeat);
            if (clientDisconnected) return;

            // Double-check Lapis 2 cache after exiting queue (coalesces simultaneous identical static requests)
            if (isStandaloneQuestion && !isLiveContextQuery) {
              const queuedCacheHit = getSharedCachedReply(questionText, firstName);
              if (queuedCacheHit) {
                const durationMs = Date.now() - reqStart;
                console.log(`[Chat API Lapis 2 Post-Queue Cache Hit] ${durationMs}ms`);
                void recordAiChatLog({ studentName: studentName || firstName, questionText, durationMs });
                res.write(`data: ${JSON.stringify({ text: queuedCacheHit })}\n\n`);
                res.write(`data: ${JSON.stringify({ done: true, ...(debug ? { source: "cache-coalesced", ms: durationMs } : {}) })}\n\n`);
                res.end();
                return;
              }
            }

            let lastError: any = null;
            let hasEmittedAnyChunk = false;

            for (const entry of modelConfigs) {
              for (let attempt = 0; attempt < 2; attempt++) {
                if (clientDisconnected) return;
                const attemptStart = Date.now();
                const attemptController = new AbortController();
                let firstTokenTimer: NodeJS.Timeout | null = setTimeout(() => {
                  if (!hasEmittedAnyChunk) {
                    console.log(`[Chat API Stream] ${entry.model} attempt ${attempt + 1} reached ${entry.firstTokenTimeoutMs}ms, switching/recovering...`);
                    attemptController.abort();
                  }
                }, entry.firstTokenTimeoutMs);

                try {
                  const responseStream = await ai.models.generateContentStream({
                    model: entry.model,
                    contents,
                    config: {
                      ...entry.config,
                      abortSignal: attemptController.signal,
                    },
                  });

                  let assembledText = "";
                  for await (const chunk of responseStream) {
                    if (clientDisconnected) {
                      if (firstTokenTimer) clearTimeout(firstTokenTimer);
                      return;
                    }
                    const chunkText = chunk.text || "";
                    if (chunkText) {
                      if (!hasEmittedAnyChunk) {
                        if (firstTokenTimer) {
                          clearTimeout(firstTokenTimer);
                          firstTokenTimer = null;
                        }
                        hasEmittedAnyChunk = true;
                        console.log(`[Chat API Stream] ${entry.model} TTFT: ${Date.now() - reqStart}ms`);
                      }
                      assembledText += chunkText;
                      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                    }
                  }

                  if (firstTokenTimer) clearTimeout(firstTokenTimer);

                  if (hasEmittedAnyChunk) {
                    const durationMs = Date.now() - reqStart;
                    attemptLogs.push({ model: entry.model, ms: Date.now() - attemptStart, ok: true });
                    if (isStandaloneQuestion && !isLiveContextQuery && assembledText.trim()) {
                      setSharedCachedReply(questionText, assembledText, firstName, studentName);
                    }
                    void recordAiChatLog({ studentName: studentName || firstName, questionText, durationMs });
                    res.write(
                      `data: ${JSON.stringify({
                        done: true,
                        ...(debug ? { source: "gemini", attemptLogs, ms: durationMs } : {}),
                      })}\n\n`
                    );
                    console.log(`[Chat API Stream] Completed ${entry.model} in ${durationMs}ms`);
                    res.end();
                    return;
                  }

                  throw new Error(`Model ${entry.model} mengembalikan respons kosong.`);
                } catch (err: any) {
                  if (firstTokenTimer) clearTimeout(firstTokenTimer);
                  const errMsg = err?.message || String(err);
                  attemptLogs.push({ model: entry.model, ms: Date.now() - attemptStart, ok: false, err: errMsg });
                  console.log(`[Chat API Stream] Failover from ${entry.model} (attempt ${attempt + 1}) after ${Date.now() - reqStart}ms: ${errMsg}`);
                  lastError = err;

                  if (hasEmittedAnyChunk) {
                    res.write(`data: ${JSON.stringify({ error: "Koneksi terputus di tengah jawaban. Silakan coba kirim ulang ya." })}\n\n`);
                    res.end();
                    return;
                  }

                  if (attempt === 0 && isRetryableGeminiError(err)) {
                    await new Promise((r) => setTimeout(r, 300));
                    continue;
                  }
                  break;
                }
              }
            }

            // Inline non-streaming safety fallback if all streaming calls stalled/aborted without emitting chunks
            const lastErrStr = String(lastError?.message || "");
            const isAuthErr =
              lastErrStr.includes("403") ||
              lastErrStr.includes("PERMISSION_DENIED") ||
              lastErrStr.includes("API_KEY_INVALID");

            if (!isAuthErr && !clientDisconnected) {
              for (const entry of modelConfigs) {
                if (clientDisconnected) return;
                const attemptStart = Date.now();
                const fallbackController = new AbortController();
                const fallbackTimer = setTimeout(() => fallbackController.abort(), 16000);
                try {
                  const response = await ai.models.generateContent({
                    model: entry.model,
                    contents,
                    config: {
                      ...entry.config,
                      abortSignal: fallbackController.signal,
                    },
                  });
                  clearTimeout(fallbackTimer);

                  if (response?.text?.trim()) {
                    const durationMs = Date.now() - reqStart;
                    attemptLogs.push({ model: `${entry.model}:sync-fallback`, ms: Date.now() - attemptStart, ok: true });
                    if (isStandaloneQuestion && !isLiveContextQuery) {
                      setSharedCachedReply(questionText, response.text, firstName, studentName);
                    }
                    void recordAiChatLog({ studentName: studentName || firstName, questionText, durationMs });
                    res.write(`data: ${JSON.stringify({ text: response.text })}\n\n`);
                    res.write(
                      `data: ${JSON.stringify({
                        done: true,
                        ...(debug ? { source: "gemini-sync-fallback", attemptLogs, ms: durationMs } : {}),
                      })}\n\n`
                    );
                    res.end();
                    return;
                  }
                } catch (syncErr: any) {
                  clearTimeout(fallbackTimer);
                  attemptLogs.push({ model: `${entry.model}:sync-fallback`, ms: Date.now() - attemptStart, ok: false, err: syncErr?.message || String(syncErr) });
                  lastError = syncErr;
                }
              }
            }

            console.error("[Chat API Stream] All models and fallbacks failed:", lastError?.message || lastError);
            const friendlyErr = formatFriendlyGeminiError(lastError, assistantName, firstName);
            res.write(
              `data: ${JSON.stringify({
                error: friendlyErr,
                ...(debug ? { source: "gemini", attemptLogs, details: lastError?.message } : {}),
              })}\n\n`
            );
            res.end();
          },
          () => clientDisconnected
        );
      } catch (queueErr: any) {
        clearInterval(queueHeartbeat);
        if (!clientDisconnected && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: formatFriendlyGeminiError(queueErr, assistantName, firstName) })}\n\n`);
          res.end();
        }
      } finally {
        clearInterval(queueHeartbeat);
      }
      return;
    }

    // Standard JSON fallback (Lapis 3 queued)
    const jsonResult = await runWithGeminiQueue(async () => {
      if (isStandaloneQuestion && !isLiveContextQuery) {
        const queuedCacheHit = getSharedCachedReply(questionText, firstName);
        if (queuedCacheHit) {
          return { text: queuedCacheHit, source: "cache-coalesced" as const };
        }
      }

      let lastError: any = null;
      for (const entry of modelConfigs) {
        for (let attempt = 0; attempt < 2; attempt++) {
          const attemptStart = Date.now();
          const attemptController = new AbortController();
          const attemptTimer = setTimeout(() => attemptController.abort(), 16000);
          try {
            const response = await ai.models.generateContent({
              model: entry.model,
              contents,
              config: {
                ...entry.config,
                abortSignal: attemptController.signal,
              },
            });
            clearTimeout(attemptTimer);

            if (response?.text?.trim()) {
              attemptLogs.push({ model: entry.model, ms: Date.now() - attemptStart, ok: true });
              if (isStandaloneQuestion && !isLiveContextQuery) {
                setSharedCachedReply(questionText, response.text, firstName, studentName);
              }
              return { text: response.text, source: "gemini" as const };
            }
            throw new Error(`Model ${entry.model} returned empty text.`);
          } catch (err: any) {
            clearTimeout(attemptTimer);
            const errMsg = err?.message || String(err);
            attemptLogs.push({ model: entry.model, ms: Date.now() - attemptStart, ok: false, err: errMsg });
            console.log(`[Chat API] Failover from ${entry.model} (attempt ${attempt + 1}): ${errMsg}`);
            lastError = err;
            if (attempt === 0 && isRetryableGeminiError(err)) {
              await new Promise((r) => setTimeout(r, 300));
              continue;
            }
            break;
          }
        }
      }

      throw lastError || new Error("All Gemini models failed");
    });

    void recordAiChatLog({ studentName: studentName || firstName, questionText, durationMs: Date.now() - reqStart });
    return res.json({
      text: jsonResult.text,
      ...(debug ? { source: jsonResult.source, attemptLogs, ms: Date.now() - reqStart } : {}),
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    const assistantName = "Si Pinter";
    const fallbackName = extractFirstName(req.body?.studentName);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: formatFriendlyGeminiError(error, assistantName, fallbackName) })}\n\n`);
      return res.end();
    }
    return res.status(500).json({
      error: formatFriendlyGeminiError(error, assistantName, fallbackName),
      ...(req.body?.debug ? { details: error?.message } : {}),
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.use((req, res, next) => {
    if (req.url.startsWith("/api")) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  app.post("/api/chat", handleChatRequest);

  // AI Stats & Violations API
  app.get("/api/ai-stats", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const logMap = new Map<string, any>();
      inMemoryAiLogs.forEach((l) => {
        if (l?.id) logMap.set(l.id, l);
      });

      const violMap = new Map<string, any>();
      inMemoryAiViolations.forEach((v) => {
        if (v?.id) violMap.set(v.id, v);
      });

      if (db && firestoreApiAvailable) {
        try {
          const logsSnap = await db.collection("aiChatLogs").get();
          logsSnap.forEach((docSnap: any) => {
            const data = docSnap.data();
            const key = data?.id || docSnap.id;
            logMap.set(key, { id: docSnap.id, ...data });
          });
        } catch (e: any) {
          if (e?.message?.includes("PERMISSION_DENIED") || e?.code === 7) {
            firestoreApiAvailable = false;
          }
        }

        try {
          const violSnap = await db.collection("aiViolations").orderBy("timestamp", "desc").limit(100).get();
          violSnap.forEach((docSnap: any) => {
            const data = docSnap.data();
            const key = data?.id || docSnap.id;
            violMap.set(key, { id: docSnap.id, ...data });
          });
        } catch (e: any) {
          if (e?.message?.includes("PERMISSION_DENIED") || e?.code === 7) {
            firestoreApiAvailable = false;
          }
        }
      }

      const allLogs = Array.from(logMap.values());
      const totalQuestions = allLogs.length;
      let totalDuration = 0;
      let durationCount = 0;
      allLogs.forEach((l) => {
        if (typeof l.durationMs === "number" && l.durationMs > 0) {
          totalDuration += l.durationMs;
          durationCount++;
        }
      });
      const avgDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

      const violations = Array.from(violMap.values()).sort(
        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      );

      res.json({
        totalQuestions,
        avgDurationMs,
        violations,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      let totalDur = 0;
      inMemoryAiLogs.forEach((l) => (totalDur += l.durationMs || 0));
      res.json({
        totalQuestions: inMemoryAiLogs.length,
        avgDurationMs: inMemoryAiLogs.length > 0 ? Math.round(totalDur / inMemoryAiLogs.length) : 0,
        violations: inMemoryAiViolations,
        serverTimestamp: new Date().toISOString(),
      });
    }
  });

  app.post("/api/ai-violations/:id/resolve", async (req, res) => {
    try {
      const { id } = req.params;
      const target = inMemoryAiViolations.find(v => v.id === id);
      if (target) {
        target.status = "Sudah Ditindaklanjuti";
        target.resolvedAt = new Date().toISOString();
      }
      if (db && firestoreApiAvailable) {
        try {
          await db.collection("aiViolations").doc(id).update({
            status: "Sudah Ditindaklanjuti",
            resolvedAt: new Date().toISOString(),
          });
        } catch (e: any) {
          if (e?.message?.includes("PERMISSION_DENIED") || e?.code === 7) {
            firestoreApiAvailable = false;
          }
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      res.json({ success: true });
    }
  });

  // API Route for Gemini Title Generation
  app.post("/api/generate-title", async (req, res) => {
    try {
      const { bab } = req.body;
      if (!bab) {
        return res.status(400).json({ error: "Bab is required" });
      }

      const prompt = `Berikan satu judul materi pelajaran yang menarik, profesional, dan sangat relevan untuk bab pelajaran berikut: "${bab}". Berikan HANYA judulnya saja tanpa tanda kutip, tanpa penjelasan tambahan, dan maksimal 10 kata.`;
      
      const response = await generateContentWithFallback({
          contents: prompt,
      });

      const title = response.text ? response.text.trim() : "";
      
      res.json({ title: title.replace(/^"|"$/g, '') });
    } catch (error) {
      console.error("Error generating title:", error);
      res.status(500).json({ error: "Failed to generate title" });
    }
  });

  // API Route for Gemini Exam Generation with structured output (supports up to 3 PDFs and up to 3 YouTube links)
  app.post("/api/generate-exam", upload.any(), async (req, res) => {
    try {
      const { subject, bab, count, tema, materi, description, pastedText, youtubeUrls, questionFormat } = req.body;
      if (!subject || !bab) {
        return res.status(400).json({ error: "Mata pelajaran dan Bab wajib diisi" });
      }

      const questionCount = Number(count) || 5;
      const formatMode = (questionFormat || "multiple_choice") as string;
      let formatInstruction = `Setiap soal harus bertipe "multiple_choice" dengan tepat 5 pilihan opsi (A, B, C, D, E) yang masuk akal dan tentukan correctIndex (0..4).`;
      if (formatMode === "short_answer") {
        formatInstruction = `Setiap soal harus bertipe "short_answer" (Isian Singkat). Isi options sebagai array kosong [], correctIndex sebagai 0, dan isi correctAnswerText dengan kunci jawaban singkat yang tepat (bisa pisahkan variasi jawaban valid dengan tanda |, misal: "CPU|Central Processing Unit").`;
      } else if (formatMode === "essay") {
        formatInstruction = `Setiap soal harus bertipe "essay" (Uraian/Esai). Isi options sebagai array kosong [], correctIndex sebagai 0, dan isi correctAnswerText dengan poin-poin kunci jawaban/rubrik penilaian esai.`;
      } else if (formatMode === "mixed") {
        formatInstruction = `Buatlah variasi campuran soal yang proporsional (sekitar 60% "multiple_choice", 20% "short_answer", dan 20% "essay").
- Untuk "multiple_choice": wajib memiliki tepat 5 opsi di options[] dan correctIndex (0..4), correctAnswerText kosong "".
- Untuk "short_answer": options[] kosong [], correctIndex 0, dan correctAnswerText berisi jawaban singkat yang akurat (variasi dipisah |).
- Untuk "essay": options[] kosong [], correctIndex 0, dan correctAnswerText berisi kunci jawaban/rubrik penilaian.`;
      }

      let prompt = "";

      if (pastedText && pastedText.trim()) {
        prompt = `Konversikan teks butir soal/materi kuis berikut menjadi tepat ${questionCount} soal terstruktur dalam bahasa Indonesia untuk mata pelajaran "${subject}" dengan bahasan Bab: "${bab}"${materi ? ` dan fokus materi yang diujikan: "${materi}"` : ""}.

Teks Referensi Soal/Kuis:
---
${pastedText}
---

Instruksi Tambahan:
1. Ekstrak pertanyaan, tipe soal, pilihan opsi, dan kunci jawaban dari teks di atas secara akurat.
2. ${formatInstruction}
3. Untuk setiap soal wajib isi field "indikator" berupa Tujuan Indikator Pencapaian Kompetensi (IPK) yang JELAS, LENGKAP, MUDAH DIPAHAMI SISWA, dan menyatu langsung dengan materi yang diujikan serta isi pertanyaan soal (tidak membocorkan langsung teks opsi kunci jawaban). Awali dengan "Peserta didik mampu ..." atau "Disajikan [konteks soal/materi], peserta didik mampu ...".
4. Untuk setiap soal wajib isi field "lingkupMateri" berupa Ruang Lingkup Materi yang jelas dan lengkap (5–10 kata) yang menghubungkan materi ajar dengan sub-konsep yang diukur pada soal (misal: "Sistem Komputer: Peran dan Fungsi Unit Pemroses CPU", bukan sekadar 2 kata umum dan tidak menyalin opsi jawaban benar).`;
      } else {
        prompt = `Buatlah ${questionCount} soal berkualitas tinggi (berstandar AKM/UTBK jika relevan) dalam bahasa Indonesia untuk mata pelajaran "${subject}" dengan bahasan Bab: "${bab}"`;
        
        if (tema) {
          prompt += `, kategori/jenis ujian: "${tema}"`;
        }
        
        if (materi) {
          prompt += `, cakupan materi yang diujikan: "${materi}"`;
        }

        if (description) {
          prompt += `, rincian materi / fokus soal: "${description}"`;
        }
        
        prompt += `.\n\nAturan Format Soal:\n${formatInstruction}\n\nAturan Kisi-Kisi (Ruang Lingkup Materi & Tujuan Indikator Pencapaian Kompetensi):\n- Untuk setiap soal wajib isi field "indikator" berupa kalimat Tujuan Indikator Pencapaian Kompetensi (mulai dengan "Peserta didik mampu ..." atau "Disajikan ..., peserta didik mampu ...", 12–24 kata) yang SEMPURNA, LENGKAP, JELAS, dan MUDAH DIPAHAMI SISWA. Kalimat indikator harus merujuk langsung pada materi yang diujikan serta hal spesifik yang ditanyakan oleh soal tersebut tanpa membocorkan langsung opsi kunci jawaban.\n- Untuk setiap soal wajib isi field "lingkupMateri" berupa Ruang Lingkup Materi yang deskriptif dan jelas (5–10 kata, mencakup topik materi utama dan sub-bahasan soal, misal: "Pengolahan Data Spreadsheet: Penggunaan Rumus Statistik Dasar" atau "Keamanan Digital: Pencegahan Phishing dan Perlindungan OTP"). Jangan hanya 2 kata umum dan jangan menyalin mentah opsi jawaban benar.`;
      }

      // Handle YouTube URLs (up to 3 links)
      let parsedYoutubeUrls: string[] = [];
      if (youtubeUrls) {
        if (Array.isArray(youtubeUrls)) {
          parsedYoutubeUrls = youtubeUrls;
        } else if (typeof youtubeUrls === "string") {
          try {
            const parsed = JSON.parse(youtubeUrls);
            if (Array.isArray(parsed)) parsedYoutubeUrls = parsed;
            else parsedYoutubeUrls = [youtubeUrls];
          } catch {
            parsedYoutubeUrls = [youtubeUrls];
          }
        }
      }
      parsedYoutubeUrls = parsedYoutubeUrls.filter(u => typeof u === "string" && u.trim() !== "");

      if (parsedYoutubeUrls.length > 0) {
        prompt += `\n\nSumber Referensi Video Pembelajaran (YouTube):\n${parsedYoutubeUrls.map((u, i) => `${i + 1}. ${u}`).join("\n")}\nInstruksi Tambahan: Manfaatkan konsep, topik materi, dan bahasan yang ada pada video pembelajaran di atas dalam menyusun butir-butir pertanyaan soal.`;
      }

      const parts: any[] = [];
      
      // Handle uploaded files (up to 3 documents)
      const files: any[] = (req.files && Array.isArray(req.files)) ? req.files : (req.file ? [req.file] : []);
      if (files.length > 0) {
        for (const file of files.slice(0, 3)) {
          parts.push({
            inlineData: {
              data: file.buffer.toString("base64"),
              mimeType: file.mimetype || "application/pdf"
            }
          });
        }
        prompt += `\n\nLampiran Dokumen PDF Referensi (${files.length} file): Gunakan dokumen yang dilampirkan sebagai sumber referensi utama dalam pembuatan soal ujian ini.`;
      }
      
      parts.push({ text: prompt });

      const response = await generateContentWithFallback({
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "Daftar pertanyaan ujian CBT",
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: "Tipe soal: multiple_choice, short_answer, atau essay"
                },
                text: {
                  type: Type.STRING,
                  description: "Teks pertanyaan ujian kompetensi"
                },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "5 pilihan opsi jawaban (A..E) untuk multiple_choice, atau array kosong [] untuk short_answer/essay"
                },
                correctIndex: {
                  type: Type.INTEGER,
                  description: "Index pilihan jawaban yang benar (0 sampai 4) untuk multiple_choice, atau 0 untuk non-PG"
                },
                correctAnswerText: {
                  type: Type.STRING,
                  description: "Kunci jawaban untuk short_answer (variasi dipisah |) atau rubrik kunci jawaban untuk essay"
                },
                indikator: {
                  type: Type.STRING,
                  description: "Tujuan Indikator Pencapaian Kompetensi (IPK) yang lengkap, jelas, mudah dipahami siswa, merujuk pada materi yang diujikan dan konteks spesifik soal, tanpa membocorkan langsung teks kunci jawaban"
                },
                lingkupMateri: {
                  type: Type.STRING,
                  description: "Ruang Lingkup Materi yang lengkap dan jelas (5-10 kata) mencakup pokok materi dan sub-konsep yang diukur butir soal tanpa menyalin langsung kunci jawaban"
                },
                levelKognitif: {
                  type: Type.STRING,
                  description: "Level kognitif soal: L1 (Pemahaman), L2 (Penerapan), atau L3 (Penalaran)"
                }
              },
              required: ["text", "options", "correctIndex", "indikator", "lingkupMateri"]
            }
          }
        }
      });

      const responseText = response.text ? response.text.trim() : "[]";
      const rawQuestions = JSON.parse(responseText);
      const questions = Array.isArray(rawQuestions) ? rawQuestions.map((q: any) => {
        const qType = (q.type === "short_answer" || q.type === "essay" || q.type === "multiple_choice")
          ? q.type
          : (Array.isArray(q.options) && q.options.length > 0 ? "multiple_choice" : "essay");
        const normalizedOptions = qType === "multiple_choice"
          ? (Array.isArray(q.options) && q.options.length === 5
              ? q.options.map(String)
              : ["Opsi A", "Opsi B", "Opsi C", "Opsi D", "Opsi E"].map((def, idx) => String(q.options?.[idx] || def)))
          : [];
        const normalizedCorrectIndex = typeof q.correctIndex === "number" ? q.correctIndex : 0;
        const normalizedCorrectAnswerText = String(q.correctAnswerText || "");

        return {
          type: qType,
          text: String(q.text || ""),
          options: normalizedOptions,
          correctIndex: normalizedCorrectIndex,
          correctAnswerText: normalizedCorrectAnswerText,
          indikator: String(q.indikator || "").trim(),
          lingkupMateri: String(q.lingkupMateri || "").trim(),
          levelKognitif: String(q.levelKognitif || "").trim(),
        };
      }) : [];
      res.json({ questions });
    } catch (error: any) {
      console.error("Error generating exam questions:", error);
      res.status(500).json({ 
        error: "Gagal membuat soal ujian menggunakan AI.", 
        details: error.message || String(error),
        stack: error.stack
      });
    }
  });

  // API Route for synthesizing Ruang Lingkup Materi & Tujuan Indikator Pencapaian from uploaded/selected Materi
  app.post("/api/generate-kisi-kisi", upload.single("document"), async (req, res) => {
    try {
      const { subject, category, materiTitle, materiText, driveUrl } = req.body;
      const cleanTitle = String(materiTitle || "").trim();
      const cleanText = String(materiText || "").trim();
      const file = req.file;

      if (!cleanTitle && !cleanText && !file) {
        return res.status(400).json({ error: "Masukkan judul/rangkuman materi atau unggah file PDF materi terlebih dahulu." });
      }

      const parts: any[] = [];
      if (file) {
        parts.push({
          inlineData: {
            data: file.buffer.toString("base64"),
            mimeType: file.mimetype || "application/pdf",
          },
        });
      }

      const prompt = `Anda adalah penyusun perangkat asesmen Kurikulum Merdeka SMA.
Buatlah **Ruang Lingkup Materi** dan **Tujuan Indikator Pencapaian Kompetensi (IPK)** yang jelas, lengkap, terstruktur, dan mudah dipahami oleh guru maupun siswa berdasarkan materi ajar berikut yang akan diunggah/diujikan:

- Mata Pelajaran: "${subject || "Informatika"}"
- Jenis Evaluasi: "${category || "Ujian / Evaluasi"}"
${cleanTitle ? `- Judul Materi yang Di-Up: "${cleanTitle}"` : ""}
${cleanText ? `- Rangkuman / Poin Materi:\n${cleanText}` : ""}
${driveUrl ? `- Tautan Referensi Materi: ${driveUrl}` : ""}
${file ? `- File dokumen PDF materi terlampir di atas: analisis seluruh sub-bab dan konsep intinya.` : ""}

Instruksi Output:
1. "lingkupMateri": Susun Ruang Lingkup Materi yang jelas, runtut, dan informatif (sekitar 20–45 kata atau poin terstruktur dipisah titik koma), berisi cakupan konsep inti dari materi yang akan di-up agar siswa tahu persis sub-topik apa saja yang perlu dipelajari (tanpa membocorkan kunci jawaban soal).
2. "indikatorPencapaian": Susun Tujuan Indikator Pencapaian Kompetensi yang sempurna, jelas, operasional (menggunakan kata kerja terukur seperti memahami, mengidentifikasi, menerapkan, membandingkan, menganalisis), dan spesifik terhadap materi di atas (diawali "Peserta didik mampu ...").`;

      parts.push({ text: prompt });

      const response = await generateContentWithFallback({
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lingkupMateri: {
                type: Type.STRING,
                description: "Ruang Lingkup Materi yang jelas, terstruktur, dan lengkap sesuai materi yang akan di-up",
              },
              indikatorPencapaian: {
                type: Type.STRING,
                description: "Tujuan Indikator Pencapaian Kompetensi (IPK) yang jelas, operasional, lengkap, dan mudah dipahami siswa sesuai materi",
              },
            },
            required: ["lingkupMateri", "indikatorPencapaian"],
          },
        },
      });

      const parsed = JSON.parse(response.text ? response.text.trim() : "{}");
      res.json({
        lingkupMateri: String(parsed.lingkupMateri || "").trim(),
        indikatorPencapaian: String(parsed.indikatorPencapaian || "").trim(),
      });
    } catch (error: any) {
      console.error("Error generating kisi-kisi from materi:", error);
      res.status(500).json({
        error: "Gagal menyusun Ruang Lingkup & IPK dari materi.",
        details: error?.message || String(error),
      });
    }
  });

  // API Route for Student Ranking
  app.get("/api/student-ranking", async (req, res) => {
    try {
      const classId = req.query.classId as string;
      if (!classId) {
        return res.status(400).json({ error: "Class ID is required" });
      }

      const studentsSnapshot = await db.collection("studentsByNisn").where("classId", "==", classId).get();
      const attendanceSnapshot = await db.collection("absensi").get();
      const submissionsSnapshot = await db.collection("submissions").get();

      const studentScores: any[] = [];

      studentsSnapshot.forEach((doc) => {
        const student = doc.data();
        const nisn = student.nisn;

        // Calculate attendance (e.g., count of "Hadir")
        const attendanceCount = attendanceSnapshot.docs.filter(a => a.data().nisn === nisn && a.data().status === "Hadir").length;

        // Calculate on-time submissions (assuming a property "isLate" or comparison)
        const onTimeSubmissions = submissionsSnapshot.docs.filter(s => s.data().nisn === nisn && !s.data().isLate).length;

        // Simple score: attendance * 0.6 + submissions * 0.4 (weighted)
        const score = (attendanceCount * 0.6) + (onTimeSubmissions * 0.4);

        studentScores.push({ nisn: nisn, name: student.name, score });
      });

      // Sort by score
      studentScores.sort((a, b) => b.score - a.score);

      res.json({ ranking: studentScores });
    } catch (error) {
      console.error("Error calculating ranking:", error);
      res.status(500).json({ error: "Failed to calculate ranking" });
    }
  });

  // API Route to check link accessibility for Google Drive, CamScanner, Canva, OneDrive, Dropbox, & general URLs
  app.post("/api/check-drive-access", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ isDrive: false, accessible: false, provider: "unknown", providerName: "Link", message: "URL tidak valid" });
      }

      const trimmedUrl = url.trim();
      if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
        return res.status(400).json({ isDrive: false, accessible: false, provider: "invalid", providerName: "Link", message: "URL harus diawali dengan http:// atau https://" });
      }

      // Detect provider type
      const isGoogleDrive = /drive\.google\.com|docs\.google\.com/i.test(trimmedUrl);
      const isCamScanner = /camscanner\.com|cs\.co/i.test(trimmedUrl);
      const isCanva = /canva\.com/i.test(trimmedUrl);
      const isOneDrive = /onedrive\.live\.com|1drv\.ms|sharepoint\.com/i.test(trimmedUrl);
      const isDropbox = /dropbox\.com/i.test(trimmedUrl);

      let provider = "general";
      let providerName = "Tautan Web / File";

      if (isGoogleDrive) {
        provider = "google_drive";
        providerName = "Google Drive";
      } else if (isCamScanner) {
        provider = "camscanner";
        providerName = "CamScanner";
      } else if (isCanva) {
        provider = "canva";
        providerName = "Canva";
      } else if (isOneDrive) {
        provider = "onedrive";
        providerName = "OneDrive";
      } else if (isDropbox) {
        provider = "dropbox";
        providerName = "Dropbox";
      }

      // If Google Drive, perform deep restricted check
      if (isGoogleDrive) {
        let fileId = "";
        const driveFileMatch = trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const docsMatch = trimmedUrl.match(/\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
        const folderMatch = trimmedUrl.match(/\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/);
        const openIdMatch = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);

        if (driveFileMatch && driveFileMatch[1]) {
          fileId = driveFileMatch[1];
        } else if (docsMatch && docsMatch[2]) {
          fileId = docsMatch[2];
        } else if (folderMatch && folderMatch[1]) {
          fileId = folderMatch[1];
        } else if (openIdMatch && openIdMatch[1]) {
          fileId = openIdMatch[1];
        }

        if (!fileId) {
          return res.json({ isDrive: true, provider, providerName, accessible: true, message: "Link Google Drive terdeteksi" });
        }

        const checkUrls = [
          `https://drive.google.com/file/d/${fileId}/view`,
          `https://lh3.googleusercontent.com/d/${fileId}=w200`,
          `https://drive.google.com/drive/folders/${fileId}`
        ];

        let isRestricted = false;
        let isNotFound = false;

        for (const testUrl of checkUrls) {
          try {
            const response = await fetch(testUrl, {
              method: "GET",
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              redirect: "follow",
            });

            const finalUrl = response.url;
            
            if (response.status === 404) {
              isNotFound = true;
              continue;
            }

            if (
              response.status === 403 ||
              response.status === 401 ||
              finalUrl.includes("accounts.google.com") ||
              finalUrl.includes("ServiceLogin")
            ) {
              isRestricted = true;
              break;
            }

            const bodyText = await response.text();
            if (
              bodyText.includes("Anda memerlukan akses") ||
              bodyText.includes("You need access") ||
              bodyText.includes("request-access") ||
              bodyText.includes("access-denied") ||
              bodyText.includes("denied")
            ) {
              isRestricted = true;
              break;
            }

            if (response.status === 200 && !finalUrl.includes("accounts.google.com")) {
              return res.json({
                isDrive: true,
                provider,
                providerName,
                accessible: true,
                message: "Link Publik: Dapat diakses & dinilai oleh Guru.",
              });
            }
          } catch (err) {
            console.warn("Drive check fetch error:", err);
          }
        }

        if (isRestricted) {
          return res.json({
            isDrive: true,
            provider,
            providerName,
            accessible: false,
            message: "Link Google Drive Dibatasi (Restricted). Akses belum diubah ke 'Siapa saja yang memiliki link'.",
          });
        }

        if (isNotFound) {
          return res.json({
            isDrive: true,
            provider,
            providerName,
            accessible: false,
            message: "File / Folder Google Drive tidak ditemukan atau sudah dihapus.",
          });
        }

        return res.json({ isDrive: true, provider, providerName, accessible: true, message: "Link Google Drive terdeteksi" });
      }

      // For CamScanner, Canva, OneDrive, Dropbox, or General URLs
      try {
        const response = await fetch(trimmedUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          redirect: "follow",
        });

        if (response.status >= 200 && response.status < 400) {
          return res.json({
            isDrive: false,
            provider,
            providerName,
            accessible: true,
            message: `Link ${providerName} Valid & Dapat Diakses Guru.`,
          });
        } else if (response.status === 404) {
          return res.json({
            isDrive: false,
            provider,
            providerName,
            accessible: false,
            message: `Halaman/File ${providerName} tidak ditemukan (404). Mohon periksa kembali link Anda.`,
          });
        } else {
          // Keep accessible true for special web apps that block automated scraping but work in browser
          return res.json({
            isDrive: false,
            provider,
            providerName,
            accessible: true,
            message: `Link ${providerName} terdeteksi dan siap dikumpulkan.`,
          });
        }
      } catch (e) {
        // If fetch fails (e.g. CORS/network or bot blocking on backend), consider valid URL format
        return res.json({
          isDrive: false,
          provider,
          providerName,
          accessible: true,
          message: `Link ${providerName} terdeteksi dan siap dikumpulkan.`,
        });
      }
    } catch (error: any) {
      console.error("Error checking link access:", error);
      return res.status(500).json({ error: "Gagal memeriksa akses link" });
    }
  });

  // Helper function to get or create a Google Drive folder
  const getOrCreateDriveFolder = async (token: string, folderName: string, parentId?: string): Promise<string> => {
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }
    
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!searchRes.ok) {
      const err = await searchRes.text();
      if (searchRes.status === 401) {
        throw new Error("UNAUTHENTICATED: Sesi Google Drive kedaluwarsa.");
      }
      throw new Error(`Failed to search folder ${folderName}: ${err}`);
    }
    
    const searchData = await searchRes.json() as any;
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
    
    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      })
    });
    
    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create folder ${folderName}: ${err}`);
    }
    
    const createData = await createRes.json() as any;
    return createData.id;
  };

  // API Route for File Upload with Multer error handling
  app.post("/api/upload", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Kesalahan Unggah: ${err.message}` });
      } else if (err) {
        return res.status(500).json({ error: `Kesalahan Server: ${err.message}` });
      }
      next();
    });
  }, async (req: any, res: any) => {
    console.log("[Upload] Route reached. File:", req.file?.originalname);
    try {
      if (!req.file) {
          console.log("[Upload] No file in request");
          return res.status(400).json({ error: "File tidak ditemukan dalam permintaan" });
      }
      const token = req.body.token;
      if (!token) {
          console.log("[Upload] No token provided");
          return res.status(401).json({ error: "Sesi Google Drive tidak valid" });
      }

      console.log(`[Upload] Processing ${req.file.originalname} (${req.file.size} bytes)`);
      
      // Upload to Google Drive using multipart/related
      const metadata: any = {
        name: req.file.originalname,
        mimeType: req.file.mimetype,
      };

      try {
        console.log("[Upload] Getting or creating main folder...");
        const mainFolderName = "TUGAS INFORMATIKA GANJIL";
        const mainFolderId = await getOrCreateDriveFolder(token, mainFolderName);
        let parentFolderId = mainFolderId;
        
        const studentName = req.body.studentName;
        if (studentName) {
          console.log(`[Upload] Getting or creating student folder: ${studentName}...`);
          const studentFolderId = await getOrCreateDriveFolder(token, studentName, mainFolderId);
          parentFolderId = studentFolderId;
        }
        metadata.parents = [parentFolderId];
      } catch (err: any) {
        console.error("[Upload] Error creating folders:", err);
        if (err.message.includes("UNAUTHENTICATED")) {
          return res.status(401).json({ error: "Sesi Google Drive kedaluwarsa. Silakan hubungkan ulang." });
        }
        // For other folder errors, we can continue to upload to root as fallback, 
        // or we could choose to fail. Let's just log and continue for now for non-auth errors.
      }

      const boundary = '-------314159265358979323846';
      const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
      const filePart = `--${boundary}\r\nContent-Type: ${req.file.mimetype}\r\n\r\n`;
      const endPart = `\r\n--${boundary}--\r\n`;

      const body = Buffer.concat([
        Buffer.from(metadataPart),
        Buffer.from(filePart),
        req.file.buffer,
        Buffer.from(endPart)
      ]);

      console.log("[Upload] Sending request to Google API...");
      const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': `${body.length}`
        },
        body: body,
        // Add a signal/timeout if needed (Node 18+ fetch supports signal)
      });

      if (!driveRes.ok) {
        const errorText = await driveRes.text();
        console.error("[Upload] Drive API error:", errorText);
        let driveError = "Gagal mengunggah ke Google Drive";
        try {
          const driveErrJson = JSON.parse(errorText);
          driveError = driveErrJson.error?.message || driveError;
        } catch (e) {}
        return res.status(driveRes.status).json({ error: driveError });
      }

      const data = await driveRes.json() as any;
      const fileId = data.id;
      const webViewLink = data.webViewLink;

      console.log(`[Upload] File uploaded successfully. ID: ${fileId}`);

      // Make the file public (Anyone with link can view)
      console.log("[Upload] Setting file permissions...");
      const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });

      if (!permRes.ok) {
        console.warn("[Upload] Warning: Failed to set public permissions, but file was uploaded.");
      }

      console.log("[Upload] All steps completed.");
      res.json({ webViewLink });
    } catch (error: any) {
      console.error("[Upload] Critical error:", error.message, error.stack);
      res.status(500).json({ error: "Sistem gagal memproses unggahan: " + error.message });
    }
  });

  // API Route to proxy images (to bypass CORS)
  app.get("/api/proxy-image", async (req, res) => {
    try {
      let imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).send("URL is required");
      }
      
      // Auto-convert Google Drive links to direct lh3 usercontent URLs
      if (imageUrl.includes("drive.google.com") || imageUrl.includes("googleusercontent.com")) {
        const fileIdMatch = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || imageUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          imageUrl = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
        }
      }
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/png";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      console.error("Proxy image error:", error);
      res.status(500).send(error.message);
    }
  });

  // Quota & Monthly Egress Telemetry Endpoints
  const QUOTA_TELEMETRY_FILE = "/tmp/sipinter_quota_telemetry.json";
  const SUPABASE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
  const FIREBASE_DAILY_READ_LIMIT = 50000;
  const DEFAULT_SUPABASE_URL = "https://ikiruonvyfdphpxqszna.supabase.co";
  const DEFAULT_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraXJ1b252eWZkcGhweHFzem5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNjYyMzYsImV4cCI6MjEwMzc0MjIzNn0.4pfSXgg1j9z5fhP9HM9YF9zJhtbg0FIRrL0EhBAR2OA";
  let lastSupabaseProbeCache: {
    ts: number;
    status: "active" | "exhausted" | "unknown";
    healthStatus: "active" | "maintenance" | "unreachable" | "restricted";
    httpStatus?: number;
    estimatedRecovery?: string;
    message: string;
  } | null = null;
  let lastFirebaseProbeCache: { ts: number; status: "active" | "exhausted" | "unknown"; message: string } | null = null;

  const getMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };
  const getDayKey = () => new Date().toISOString().slice(0, 10);

  const readTelemetryStore = () => {
    const month = getMonthKey();
    const day = getDayKey();
    const defaults = {
      month,
      supabaseBytes: 0,
      supabaseRequests: 0,
      supabaseExhausted: false,
      day,
      firebaseReads: 0,
      firebaseWrites: 0,
      firebaseExhausted: false,
      lastUpdated: null as string | null,
    };
    try {
      if (fs.existsSync(QUOTA_TELEMETRY_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(QUOTA_TELEMETRY_FILE, "utf-8"));
        if (parsed && typeof parsed === "object") {
          const sameMonth = parsed.month === month;
          const sameDay = parsed.day === day;
          return {
            month,
            supabaseBytes: sameMonth ? Math.max(0, Number(parsed.supabaseBytes) || 0) : 0,
            supabaseRequests: sameMonth ? Math.max(0, Number(parsed.supabaseRequests) || 0) : 0,
            supabaseExhausted: sameMonth ? Boolean(parsed.supabaseExhausted) : false,
            day,
            firebaseReads: sameDay ? Math.max(0, Number(parsed.firebaseReads) || 0) : 0,
            firebaseWrites: sameDay ? Math.max(0, Number(parsed.firebaseWrites) || 0) : 0,
            firebaseExhausted: sameDay ? Boolean(parsed.firebaseExhausted) : false,
            lastUpdated: parsed.lastUpdated || null,
          };
        }
      }
    } catch (_) {}
    return defaults;
  };

  const writeTelemetryStore = (store: ReturnType<typeof readTelemetryStore>) => {
    try {
      fs.writeFileSync(QUOTA_TELEMETRY_FILE, JSON.stringify(store), "utf-8");
    } catch (_) {}
  };

  app.post("/api/quota-report", (req, res) => {
    try {
      const {
        supabaseBytes = 0,
        supabaseRequests = 0,
        supabaseExhausted,
        firebaseReads = 0,
        firebaseWrites = 0,
        firebaseExhausted,
      } = req.body || {};

      const store = readTelemetryStore();
      const addBytes = Math.max(0, Math.min(100 * 1024 * 1024, Number(supabaseBytes) || 0));
      const addReqs = Math.max(0, Math.min(1000, Number(supabaseRequests) || 0));
      const addReads = Math.max(0, Math.min(50000, Number(firebaseReads) || 0));
      const addWrites = Math.max(0, Math.min(20000, Number(firebaseWrites) || 0));

      store.supabaseBytes += addBytes;
      store.supabaseRequests += addReqs;
      store.firebaseReads += addReads;
      store.firebaseWrites += addWrites;

      if (typeof supabaseExhausted === "boolean") {
        store.supabaseExhausted = supabaseExhausted;
      }
      if (typeof firebaseExhausted === "boolean") {
        store.firebaseExhausted = firebaseExhausted;
      }
      store.lastUpdated = new Date().toISOString();
      writeTelemetryStore(store);

      return res.json({ ok: true, month: store.month, supabaseBytes: store.supabaseBytes });
    } catch (err: any) {
      return res.status(400).json({ ok: false, error: err?.message || "Invalid telemetry payload" });
    }
  });

  app.get("/api/quota-status", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const force = req.query.force === "1" || req.query.force === "true";
    const store = readTelemetryStore();
    const now = Date.now();

    // 1. Live probe Supabase (using env vars or default project config)
    const supaUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supaKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
    if (supaUrl && supaKey && (force || !lastSupabaseProbeCache || now - lastSupabaseProbeCache.ts > 60_000)) {
      try {
        const probeResp = await fetch(`${supaUrl.replace(/\/+$/, "")}/rest/v1/exams?select=id&limit=1`, {
          headers: {
            apikey: supaKey,
            Authorization: `Bearer ${supaKey}`,
          },
          signal: AbortSignal.timeout(7000),
        });
        const bodyText = await probeResp.text();
        const lower = bodyText.toLowerCase();
        if (probeResp.ok) {
          lastSupabaseProbeCache = {
            ts: now,
            status: "active",
            healthStatus: "active",
            httpStatus: probeResp.status,
            message: "Server Supabase aktif & kuota egress tersedia.",
          };
          store.supabaseExhausted = false;
        } else if (
          probeResp.status === 402 ||
          lower.includes("exceed_egress_quota") ||
          lower.includes("egress") ||
          lower.includes("quota") ||
          lower.includes("spend cap")
        ) {
          lastSupabaseProbeCache = {
            ts: now,
            status: "exhausted",
            healthStatus: "restricted",
            httpStatus: probeResp.status,
            estimatedRecovery: "± 1 – 3 jam (menunggu pelepasan otomatis pembatasan di server Supabase setelah reset siklus)",
            message: "Layanan Supabase sedang dibatasi sementara (exceed_egress_quota / menunggu sinkronisasi siklus).",
          };
          store.supabaseExhausted = true;
        } else if (
          [502, 503, 504, 520, 521, 522, 523, 524, 525, 526].includes(probeResp.status) ||
          lower.includes("maintenance") ||
          lower.includes("paused") ||
          lower.includes("restoring") ||
          lower.includes("upgrading") ||
          lower.includes("unavailable") ||
          lower.includes("starting up")
        ) {
          lastSupabaseProbeCache = {
            ts: now,
            status: "unknown",
            healthStatus: "maintenance",
            httpStatus: probeResp.status,
            estimatedRecovery: "± 15 – 60 menit (pemeliharaan atau restart server Supabase)",
            message: `Server Supabase sedang dalam mode pemeliharaan (HTTP ${probeResp.status}).`,
          };
        } else if (probeResp.status >= 500) {
          lastSupabaseProbeCache = {
            ts: now,
            status: "unknown",
            healthStatus: "unreachable",
            httpStatus: probeResp.status,
            estimatedRecovery: "± 10 – 30 menit (gangguan sementara pada server Supabase)",
            message: `Server Supabase mengalami gangguan sementara (HTTP ${probeResp.status}).`,
          };
        } else {
          lastSupabaseProbeCache = {
            ts: now,
            status: store.supabaseExhausted ? "exhausted" : "active",
            healthStatus: store.supabaseExhausted ? "restricted" : "active",
            httpStatus: probeResp.status,
            message: `HTTP ${probeResp.status}`,
          };
        }
        writeTelemetryStore(store);
      } catch (err: any) {
        lastSupabaseProbeCache = {
          ts: now,
          status: store.supabaseExhausted ? "exhausted" : "unknown",
          healthStatus: "unreachable",
          estimatedRecovery: "± 5 – 30 menit (server Supabase tidak dapat dijangkau atau koneksi timeout)",
          message: err?.message || "Server Supabase tidak dapat dijangkau.",
        };
      }
    }

    // 2. Live probe Firebase only when requested with force=1 or stale > 2 min (1 doc read max)
    if (force || !lastFirebaseProbeCache || now - lastFirebaseProbeCache.ts > 120_000) {
      try {
        const fbCfgPath = path.join(process.cwd(), "firebase-applet-config.json");
        if (fs.existsSync(fbCfgPath)) {
          const fbCfg = JSON.parse(fs.readFileSync(fbCfgPath, "utf-8"));
          const fbUrl = `https://firestore.googleapis.com/v1/projects/${fbCfg.projectId}/databases/${fbCfg.firestoreDatabaseId || "(default)"}/documents/config/school_identity?key=${fbCfg.apiKey}`;
          const fbResp = await fetch(fbUrl);
          if (fbResp.ok || fbResp.status === 404) {
            lastFirebaseProbeCache = { ts: now, status: "active", message: "Firebase Firestore aktif." };
            store.firebaseExhausted = false;
            writeTelemetryStore(store);
          } else {
            const fbErrText = (await fbResp.text()).toLowerCase();
            if (fbResp.status === 429 || fbErrText.includes("quota") || fbErrText.includes("resource_exhausted") || fbErrText.includes("resource-exhausted")) {
              lastFirebaseProbeCache = { ts: now, status: "exhausted", message: "Kuota baca harian Firebase (50.000/hari) habis." };
              store.firebaseExhausted = true;
              writeTelemetryStore(store);
            } else {
              lastFirebaseProbeCache = {
                ts: now,
                status: store.firebaseExhausted ? "exhausted" : "active",
                message: store.firebaseExhausted ? "Kuota baca harian Firebase habis." : "Status Firebase dari telemetri klien.",
              };
            }
          }
        }
      } catch (_) {
        lastFirebaseProbeCache = {
          ts: now,
          status: store.firebaseExhausted ? "exhausted" : "active",
          message: store.firebaseExhausted ? "Kuota baca harian Firebase habis." : "Status Firebase dari telemetri klien.",
        };
      }
    }

    const supaStatus = lastSupabaseProbeCache?.status || (store.supabaseExhausted ? "exhausted" : "active");
    const supaHealthStatus =
      lastSupabaseProbeCache?.healthStatus || (store.supabaseExhausted ? "restricted" : "active");
    const fbStatus = lastFirebaseProbeCache?.status || (store.firebaseExhausted ? "exhausted" : "active");
    const rawPct = (store.supabaseBytes / SUPABASE_LIMIT_BYTES) * 100;
    const supaPercentage = supaStatus === "exhausted" ? 100 : Math.min(100, Number(rawPct.toFixed(2)));

    let alertLevel: "normal" | "warning" | "critical" | "exhausted" = "normal";
    if (supaStatus === "exhausted" || supaPercentage >= 100) {
      alertLevel = "exhausted";
    } else if (supaPercentage >= 90) {
      alertLevel = "critical";
    } else if (supaPercentage >= 75) {
      alertLevel = "warning";
    }

    return res.json({
      month: store.month,
      supabase: {
        status: supaStatus,
        healthStatus: supaHealthStatus,
        httpStatus: lastSupabaseProbeCache?.httpStatus,
        estimatedRecovery: lastSupabaseProbeCache?.estimatedRecovery,
        egressBytes: store.supabaseBytes,
        limitBytes: SUPABASE_LIMIT_BYTES,
        remainingBytes: supaStatus === "exhausted" ? 0 : Math.max(0, SUPABASE_LIMIT_BYTES - store.supabaseBytes),
        percentage: supaPercentage,
        requests: store.supabaseRequests,
        message: lastSupabaseProbeCache?.message || (supaStatus === "exhausted" ? "Limit egress 5 GB tercapai." : "Koneksi Supabase normal."),
      },
      firebase: {
        status: fbStatus,
        dailyReads: store.firebaseReads,
        dailyLimitReads: FIREBASE_DAILY_READ_LIMIT,
        dailyWrites: store.firebaseWrites,
        message: lastFirebaseProbeCache?.message || (fbStatus === "exhausted" ? "Kuota baca harian Firebase habis." : "Koneksi Firebase normal."),
      },
      alertLevel,
      checkedAt: new Date().toISOString(),
    });
  });

  // Handle 404 for API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error Handler:", err);
    if (res.headersSent) {
      return next(err);
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ 
      error: err.message || "Terjadi kesalahan internal pada server",
      status
    });
  });

  // Health check endpoints for Cloud Run & deployment probes
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  app.get("/_health", (req, res) => {
    res.status(200).send("OK");
  });

  const distPath = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const isDevScript = process.env.npm_lifecycle_event === "dev";
  const isExplicitDev = process.env.NODE_ENV === "development" && isDevScript;

  // Use Vite middleware in dev or when dist/index.html does not exist yet
  if (isExplicitDev || !fs.existsSync(indexHtmlPath)) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[Server] Vite middleware mounted for dynamic development/fallback mode.");
    } catch (e) {
      console.warn("[Server] Vite middleware failed to initialize:", e);
      if (fs.existsSync(indexHtmlPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(indexHtmlPath);
        });
      } else {
        app.get('*', (req, res) => {
          res.status(503).send("System build in progress. Please refresh shortly.");
        });
      }
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        res.status(404).send("Index file not found");
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (mode: ${process.env.NODE_ENV || 'development'})`);
    console.log(`[Startup] Gemini API Key configured: ${!!process.env.GEMINI_API_KEY}`);
  });

  server.on("error", (err: any) => {
    console.error("[Server Listen Error]:", err);
  });
}

startServer().catch((err) => {
  console.error("Critical failure during startServer:", err);
  process.exit(1);
});
