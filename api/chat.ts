import {
  buildCompactSystemInstruction,
  createGeminiClient,
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
} from "./_siPinterEngine.js";

// Reuse client across warm Vercel serverless invocations
const cachedApiKey = process.env.GEMINI_API_KEY || "";
const sharedAi = cachedApiKey ? createGeminiClient(cachedApiKey) : null;

// Stay comfortably under Vercel's default 10s serverless execution limit
const MAX_SERVERLESS_BUDGET_MS = 8500;

export default async function handler(req: any, res: any) {
  const requestStartTime = Date.now();
  const getRemainingBudgetMs = () =>
    Math.max(1500, MAX_SERVERLESS_BUDGET_MS - (Date.now() - requestStartTime));

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metode tidak diizinkan. Gunakan POST." });
  }

  try {
    let body = req.body;
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
      body = body.toString("utf8");
    }
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Format JSON permintaan tidak valid." });
      }
    }

    const { messages, studentName, sipinterContext, stream, bypassLocal } = body || {};
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
      if (stream) {
        return streamTextViaSse(res, warningReply);
      }
      return res.status(200).json({ text: warningReply });
    }

    const isLiveContextQuery = Boolean(safeSipinterContext) && isLiveStudentContextQuestion(questionText);

    // LAPIS 1: Local Knowledge Base (App Guides + Informatics Bab 1-9) — 0 Gemini Quota
    if (isStandaloneQuestion && !bypassLocal && !isLiveContextQuery) {
      const localReply = matchLocalKnowledge(questionText, firstName);
      if (localReply) {
        if (stream) {
          return streamTextViaSse(res, localReply);
        }
        return res.status(200).json({ text: localReply });
      }
    }

    // LAPIS 2: Cross-Student Shared Cache — 0 Gemini Quota for repeated static questions
    if (isStandaloneQuestion && !isLiveContextQuery) {
      const cachedReply = getSharedCachedReply(questionText, firstName);
      if (cachedReply) {
        if (stream) {
          return streamTextViaSse(res, cachedReply);
        }
        return res.status(200).json({ text: cachedReply });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const friendlyMissingKey = formatFriendlyGeminiError(
        new Error("PERMISSION_DENIED: GEMINI_API_KEY belum dikonfigurasi"),
        assistantName,
        firstName
      );
      if (stream) {
        return streamTextViaSse(res, friendlyMissingKey);
      }
      return res.status(200).json({ text: friendlyMissingKey });
    }

    const ai = sharedAi || createGeminiClient(apiKey);
    const systemInstruction = buildCompactSystemInstruction(firstName, studentName, safeSipinterContext);
    const modelConfigs = getGeminiModelConfigs(systemInstruction);

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      try {
        res.flushHeaders?.();
      } catch {
        // Ignore if headers already flushed
      }

      let clientDisconnected = false;
      const safeWrite = (payload: string) => {
        if (clientDisconnected || res.writableEnded || res.destroyed) return;
        try {
          res.write(payload);
        } catch {
          clientDisconnected = true;
        }
      };
      const safeEnd = () => {
        if (res.writableEnded || res.destroyed) return;
        try {
          res.end();
        } catch {
          // Ignore close errors
        }
      };

      safeWrite(": stream-open\n\n");

      req.on?.("aborted", () => {
        clientDisconnected = true;
      });
      res.on?.("close", () => {
        if (!res.writableEnded) {
          clientDisconnected = true;
        }
      });

      const queueHeartbeat = setInterval(() => {
        safeWrite(": queue-wait\n\n");
      }, 3500);

      try {
        await runWithGeminiQueue(
          async () => {
            clearInterval(queueHeartbeat);
            if (clientDisconnected) {
              safeEnd();
              return;
            }

            if (isStandaloneQuestion && !isLiveContextQuery) {
              const queuedCacheHit = getSharedCachedReply(questionText, firstName);
              if (queuedCacheHit) {
                safeWrite(`data: ${JSON.stringify({ text: queuedCacheHit })}\n\n`);
                safeWrite(`data: ${JSON.stringify({ done: true })}\n\n`);
                safeEnd();
                return;
              }
            }

            let lastError: any = null;
            let hasEmittedAnyChunk = false;

            for (const entry of modelConfigs) {
              if (Date.now() - requestStartTime >= MAX_SERVERLESS_BUDGET_MS) break;

              for (let attempt = 0; attempt < 2; attempt++) {
                if (clientDisconnected) {
                  safeEnd();
                  return;
                }
                if (Date.now() - requestStartTime >= MAX_SERVERLESS_BUDGET_MS) break;

                const attemptController = new AbortController();
                const attemptTimeout = Math.min(entry.firstTokenTimeoutMs, getRemainingBudgetMs());
                let firstTokenTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
                  if (!hasEmittedAnyChunk) {
                    attemptController.abort();
                  }
                }, attemptTimeout);

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
                      safeEnd();
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
                      }
                      assembledText += chunkText;
                      safeWrite(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                    }
                  }

                  if (firstTokenTimer) clearTimeout(firstTokenTimer);

                  if (hasEmittedAnyChunk) {
                    if (isStandaloneQuestion && !isLiveContextQuery && assembledText.trim()) {
                      setSharedCachedReply(questionText, assembledText, firstName, studentName);
                    }
                    safeWrite(`data: ${JSON.stringify({ done: true })}\n\n`);
                    safeEnd();
                    return;
                  }

                  throw new Error(`Model ${entry.model} mengembalikan respons kosong.`);
                } catch (err: any) {
                  if (firstTokenTimer) clearTimeout(firstTokenTimer);
                  lastError = err;
                  if (hasEmittedAnyChunk) {
                    safeWrite(`data: ${JSON.stringify({ error: "Koneksi terputus di tengah jawaban. Silakan coba kirim ulang ya." })}\n\n`);
                    safeEnd();
                    return;
                  }
                  if (
                    attempt === 0 &&
                    isRetryableGeminiError(err) &&
                    Date.now() - requestStartTime < MAX_SERVERLESS_BUDGET_MS - 2000
                  ) {
                    await new Promise((r) => setTimeout(r, 250));
                    continue;
                  }
                  break;
                }
              }
            }

            const lastErrStr = String(lastError?.message || "");
            const isAuthErr =
              lastErrStr.includes("403") ||
              lastErrStr.includes("PERMISSION_DENIED") ||
              lastErrStr.includes("API_KEY_INVALID");

            if (
              !isAuthErr &&
              !clientDisconnected &&
              Date.now() - requestStartTime < MAX_SERVERLESS_BUDGET_MS - 1500
            ) {
              for (const entry of modelConfigs) {
                if (clientDisconnected) {
                  safeEnd();
                  return;
                }
                if (Date.now() - requestStartTime >= MAX_SERVERLESS_BUDGET_MS) break;

                const fallbackController = new AbortController();
                const fallbackTimer = setTimeout(
                  () => fallbackController.abort(),
                  getRemainingBudgetMs()
                );
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
                    if (isStandaloneQuestion && !isLiveContextQuery) {
                      setSharedCachedReply(questionText, response.text, firstName, studentName);
                    }
                    safeWrite(`data: ${JSON.stringify({ text: response.text })}\n\n`);
                    safeWrite(`data: ${JSON.stringify({ done: true })}\n\n`);
                    safeEnd();
                    return;
                  }
                } catch (syncErr: any) {
                  clearTimeout(fallbackTimer);
                  lastError = syncErr;
                }
              }
            }

            safeWrite(
              `data: ${JSON.stringify({
                error: formatFriendlyGeminiError(lastError, assistantName, firstName),
              })}\n\n`
            );
            safeEnd();
          },
          () => clientDisconnected
        );
      } catch (queueErr: any) {
        clearInterval(queueHeartbeat);
        if (!clientDisconnected) {
          safeWrite(
            `data: ${JSON.stringify({
              error: formatFriendlyGeminiError(queueErr, assistantName, firstName),
            })}\n\n`
          );
        }
        safeEnd();
      } finally {
        clearInterval(queueHeartbeat);
        safeEnd();
      }
      return;
    }

    const jsonText = await runWithGeminiQueue(async () => {
      if (isStandaloneQuestion && !isLiveContextQuery) {
        const queuedCacheHit = getSharedCachedReply(questionText, firstName);
        if (queuedCacheHit) return queuedCacheHit;
      }

      let lastError: any = null;
      for (const entry of modelConfigs) {
        if (Date.now() - requestStartTime >= MAX_SERVERLESS_BUDGET_MS) break;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (Date.now() - requestStartTime >= MAX_SERVERLESS_BUDGET_MS) break;
          const attemptController = new AbortController();
          const attemptTimer = setTimeout(() => attemptController.abort(), getRemainingBudgetMs());
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
              if (isStandaloneQuestion && !isLiveContextQuery) {
                setSharedCachedReply(questionText, response.text, firstName, studentName);
              }
              return response.text;
            }
            throw new Error(`Model ${entry.model} returned empty text.`);
          } catch (err: any) {
            clearTimeout(attemptTimer);
            lastError = err;
            if (
              attempt === 0 &&
              isRetryableGeminiError(err) &&
              Date.now() - requestStartTime < MAX_SERVERLESS_BUDGET_MS - 2000
            ) {
              await new Promise((r) => setTimeout(r, 250));
              continue;
            }
            break;
          }
        }
      }

      throw lastError || new Error("All Gemini models failed");
    });

    return res.status(200).json({ text: jsonText });
  } catch (error: any) {
    const fallbackName = extractFirstName(req.body?.studentName);
    if (res.headersSent) {
      try {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: formatFriendlyGeminiError(error, "Si Pinter", fallbackName) })}\n\n`);
          res.end();
        }
      } catch {
        // ignore socket write error
      }
      return;
    }
    return res.status(500).json({
      error: formatFriendlyGeminiError(error, "Si Pinter", fallbackName),
    });
  }
}
