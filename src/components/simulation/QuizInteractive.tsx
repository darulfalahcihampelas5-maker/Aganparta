import React, { useState } from "react";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Flame,
} from "lucide-react";
import { Question } from "./simulationData";
import { sound } from "./soundEffects";

interface QuizInteractiveProps {
  questions: Question[];
  levelTitle: string;
  passingScore: number;
  onFinishQuiz: (finalScore: number, passed: boolean) => void;
  onOpenModule?: () => void;
  isTeacherMode?: boolean;
}

export const QuizInteractive: React.FC<QuizInteractiveProps> = ({
  questions,
  levelTitle,
  passingScore,
  onFinishQuiz,
  onOpenModule,
  isTeacherMode,
}) => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const currentQuestion = questions[currentIdx];
  const userChoice = selectedAnswers[currentQuestion.id];
  const hasAnsweredCurrent = userChoice !== undefined;

  const handleSelectOption = (optIdx: number) => {
    if (hasAnsweredCurrent && !isTeacherMode) return;

    sound.playClick();
    const isCorrect = optIdx === currentQuestion.correctIndex;
    if (isCorrect) {
      sound.playCoin();
    } else {
      sound.playFail();
    }

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optIdx,
    }));
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    sound.playStep();
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setShowExplanation(selectedAnswers[questions[currentIdx + 1].id] !== undefined);
    } else {
      // Calculate final score
      let totalEarned = 0;
      let totalMax = 0;
      questions.forEach((q) => {
        totalMax += q.points;
        if (selectedAnswers[q.id] === q.correctIndex) {
          totalEarned += q.points;
        }
      });

      const finalScore = Math.round((totalEarned / totalMax) * 100);
      const passed = finalScore >= passingScore;

      if (passed) {
        sound.playSuccess();
      } else {
        sound.playFail();
      }

      setIsCompleted(true);
      onFinishQuiz(finalScore, passed);
    }
  };

  const handleRestartQuiz = () => {
    sound.playClick();
    setSelectedAnswers({});
    setCurrentIdx(0);
    setShowExplanation(false);
    setIsCompleted(false);
  };

  // Completion Screen
  if (isCompleted) {
    let correctCount = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) correctCount++;
    });
    const finalScore = Math.round((correctCount / questions.length) * 100);
    const isPassed = finalScore >= passingScore;

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col items-center text-center max-w-2xl mx-auto">
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${
            isPassed
              ? "bg-emerald-100 text-emerald-600 border-2 border-emerald-300 animate-bounce"
              : "bg-amber-100 text-amber-600 border-2 border-amber-300"
          }`}
        >
          {isPassed ? <Trophy className="w-10 h-10" /> : <Award className="w-10 h-10" />}
        </div>

        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
          Hasil Kuis Evaluasi Berpikir Komputasional
        </span>
        <h3 className="text-2xl font-black text-slate-800 mt-1">{levelTitle}</h3>

        <div className="my-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 w-full flex items-center justify-around">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Nilai Akhir
            </span>
            <span
              className={`text-4xl font-black font-mono ${
                isPassed ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {finalScore}
            </span>
            <span className="text-xs text-slate-400"> / 100</span>
          </div>

          <div className="h-12 w-px bg-slate-200" />

          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Status Kelulusan
            </span>
            <span
              className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-black ${
                isPassed
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {isPassed ? "LULUS KOMPETENSI" : `BELUM LULUS (Min. ${passingScore})`}
            </span>
          </div>

          <div className="h-12 w-px bg-slate-200" />

          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Jawaban Benar
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              {correctCount} / {questions.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRestartQuiz}
            className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ulangi Kuis</span>
          </button>

          {onOpenModule && (
            <button
              type="button"
              onClick={onOpenModule}
              className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-sky-600/20"
            >
              <BookOpen className="w-4 h-4" />
              <span>Buka Modul Materi Pembahasan</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
      {/* Quiz Top Progress */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kuis Interaktif • {levelTitle}
            </span>
            <h4 className="text-sm font-black text-white">
              Soal {currentIdx + 1} dari {questions.length}
            </h4>
          </div>
        </div>

        {/* Question dots indicator */}
        <div className="flex items-center gap-1.5">
          {questions.map((q, idx) => {
            const ans = selectedAnswers[q.id];
            const isCorrect = ans === q.correctIndex;
            return (
              <div
                key={q.id}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === currentIdx
                    ? "ring-2 ring-emerald-400 scale-125 bg-emerald-500"
                    : ans !== undefined
                    ? isCorrect
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                    : "bg-slate-700"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Question Body */}
      <div className="p-6 md:p-8 space-y-6">
        {/* Scenario Card if available */}
        {currentQuestion.scenario && (
          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 text-sky-950 text-xs leading-relaxed">
            <span className="font-bold text-sky-800 uppercase tracking-wider text-[10px] block mb-1">
              📖 Skenario Kasus:
            </span>
            <p>{currentQuestion.scenario}</p>
          </div>
        )}

        {/* Question Statement */}
        <h3 className="text-base md:text-lg font-bold text-slate-800 leading-snug">
          {currentQuestion.question}
        </h3>

        {/* Options List */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, optIdx) => {
            const isSelected = userChoice === optIdx;
            const isCorrect = optIdx === currentQuestion.correctIndex;

            let btnStyle = "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50";

            if (hasAnsweredCurrent) {
              if (isCorrect) {
                btnStyle = "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-sm";
              } else if (isSelected) {
                btnStyle = "bg-rose-50 border-rose-400 text-rose-950 font-bold shadow-sm";
              } else {
                btnStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
              }
            }

            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full p-4 rounded-2xl border text-left text-xs md:text-sm transition-all flex items-start gap-3 cursor-pointer ${btnStyle}`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 ${
                    hasAnsweredCurrent && isCorrect
                      ? "bg-emerald-500 text-white"
                      : hasAnsweredCurrent && isSelected
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {String.fromCharCode(65 + optIdx)}
                </div>
                <span className="flex-1 leading-relaxed">{option}</span>

                {hasAnsweredCurrent && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {hasAnsweredCurrent && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Detailed Explanation Drawer (shown immediately after answer) */}
        {showExplanation && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Pembahasan Berpikir Komputasional:</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {hasAnsweredCurrent ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Jawaban tersimpan. Lanjutkan ke soal berikutnya.
            </span>
          ) : (
            <span>Pilih salah satu jawaban di atas untuk melihat pembahasan.</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleNextQuestion}
          disabled={!hasAnsweredCurrent}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
        >
          <span>{currentIdx === questions.length - 1 ? "Lihat Nilai Akhir" : "Soal Selanjutnya"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
