import {
  buildCompactSystemInstruction,
  createGeminiClient,
  extractFirstName,
  formatFriendlyGeminiError,
  getGeminiModelConfigs,
  getSharedCachedReply,
  isRetryableGeminiError,
  matchLocalKnowledge,
  normalizeGeminiTurns,
  runWithGeminiQueue,
  setSharedCachedReply,
  streamTextViaSse,
  checkProfanity,
  getProfanityWarningMessage,
} from "./_siPinterEngine";

// Reuse client across warm Vercel serverless invocations
const cachedApiKey = process.env.GEMINI_API_KEY || "";
const sharedAi = cachedApiKey ? createGeminiClient(cachedApiKey) : null;

export default async function handler(req: any, res: any) {
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
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Format JSON permintaan tidak valid." });
      }
    }

    const { messages, studentName, stream, bypassLocal } = body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    }

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

    // LAPIS 1: Local Knowledge Base (App Guides + Informatics Bab 1-9) — 0 Gemini Quota
    if (isStandaloneQuestion && !bypassLocal) {
      const localReply = matchLocalKnowledge(questionText, firstName);
      if (localReply) {
        if (stream) {
          return streamTextViaSse(res, localReply);
        }
        return res.status(200).json({ text: localReply });
      }
    }

    // LAPIS 2: Cross-Student Shared Cache — 0 Gemini Quota for repeated questions across all 300 students
    if (isStandaloneQuestion) {
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
      return res.status(500).json({ error: "Kunci API Gemini (GEMINI_API_KEY) belum dikonfigurasi di server." });
    }

    const ai = sharedAi || createGeminiClient(apiKey);
    const systemInstruction = buildCompactSystemInstruction(firstName, studentName);
    const modelConfigs = getGeminiModelConfigs(systemInstruction);

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();
      res.write(": stream-open\n\n");

      let clientDisconnected = false;
      res.on?.("close", () => {
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

            if (isStandaloneQuestion) {
              const queuedCacheHit = getSharedCachedReply(questionText, firstName);
              if (queuedCacheHit) {
                res.write(`data: ${JSON.stringify({ text: queuedCacheHit })}\n\n`);
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                res.end();
                return;
              }
            }

            let lastError: any = null;
            let hasEmittedAnyChunk = false;

            for (const entry of modelConfigs) {
              for (let attempt = 0; attempt < 2; attempt++) {
                if (clientDisconnected) return;
                const attemptController = new AbortController();
                let firstTokenTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
                  if (!hasEmittedAnyChunk) {
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
                      }
                      assembledText += chunkText;
                      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                    }
                  }

                  if (firstTokenTimer) clearTimeout(firstTokenTimer);

                  if (hasEmittedAnyChunk) {
                    if (isStandaloneQuestion && assembledText.trim()) {
                      setSharedCachedReply(questionText, assembledText, firstName, studentName);
                    }
                    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                    res.end();
                    return;
                  }

                  throw new Error(`Model ${entry.model} mengembalikan respons kosong.`);
                } catch (err: any) {
                  if (firstTokenTimer) clearTimeout(firstTokenTimer);
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

            const lastErrStr = String(lastError?.message || "");
            const isAuthErr =
              lastErrStr.includes("403") ||
              lastErrStr.includes("PERMISSION_DENIED") ||
              lastErrStr.includes("API_KEY_INVALID");

            if (!isAuthErr && !clientDisconnected) {
              for (const entry of modelConfigs) {
                if (clientDisconnected) return;
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
                    if (isStandaloneQuestion) {
                      setSharedCachedReply(questionText, response.text, firstName, studentName);
                    }
                    res.write(`data: ${JSON.stringify({ text: response.text })}\n\n`);
                    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                    res.end();
                    return;
                  }
                } catch (syncErr: any) {
                  clearTimeout(fallbackTimer);
                  lastError = syncErr;
                }
              }
            }

            res.write(
              `data: ${JSON.stringify({
                error: formatFriendlyGeminiError(lastError, assistantName, firstName),
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

    const jsonText = await runWithGeminiQueue(async () => {
      if (isStandaloneQuestion) {
        const queuedCacheHit = getSharedCachedReply(questionText, firstName);
        if (queuedCacheHit) return queuedCacheHit;
      }

      let lastError: any = null;
      for (const entry of modelConfigs) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: entry.model,
              contents,
              config: entry.config,
            });

            if (response?.text?.trim()) {
              if (isStandaloneQuestion) {
                setSharedCachedReply(questionText, response.text, firstName, studentName);
              }
              return response.text;
            }
            throw new Error(`Model ${entry.model} returned empty text.`);
          } catch (err: any) {
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

    return res.status(200).json({ text: jsonText });
  } catch (error: any) {
    const fallbackName = extractFirstName(req.body?.studentName);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: formatFriendlyGeminiError(error, "Si Pinter", fallbackName) })}\n\n`);
      return res.end();
    }
    return res.status(500).json({
      error: formatFriendlyGeminiError(error, "Si Pinter", fallbackName),
    });
  }
}
