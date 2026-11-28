import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  HardDrive,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  fetchUnifiedQuotaStatus,
  SUPABASE_EGRESS_LIMIT_BYTES,
  UnifiedQuotaStatus,
} from "../../lib/supabaseSync";

interface QuotaStatusWidgetProps {
  sessionReads: number;
  sessionWrites: number;
  storageUsedFormatted: string;
  storagePercentage: number;
  onOpenStorageMenu?: () => void;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${Math.round(bytes)} B`;
}

export const QuotaStatusWidget: React.FC<QuotaStatusWidgetProps> = ({
  sessionReads,
  sessionWrites,
  storageUsedFormatted,
  storagePercentage,
  onOpenStorageMenu,
}) => {
  const [status, setStatus] = useState<UnifiedQuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadQuotaStatus = async (force = false) => {
    if (force) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const result = await fetchUnifiedQuotaStatus(force);
      setStatus(result);
    } catch (_) {
      // Keep previous snapshot on transient failure
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadQuotaStatus(false);

    const handleLiveUpdate = () => {
      void loadQuotaStatus(false);
    };
    window.addEventListener("supabase-egress-updated", handleLiveUpdate);
    window.addEventListener("supabase-quota-updated", handleLiveUpdate);
    window.addEventListener("firestore-quota-exceeded", handleLiveUpdate);
    return () => {
      window.removeEventListener("supabase-egress-updated", handleLiveUpdate);
      window.removeEventListener("supabase-quota-updated", handleLiveUpdate);
      window.removeEventListener("firestore-quota-exceeded", handleLiveUpdate);
    };
  }, []);

  const monthLabel = useMemo(() => {
    const rawMonth = status?.month || new Date().toISOString().slice(0, 7);
    const [year, month] = rawMonth.split("-");
    const names = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const idx = Math.max(0, Math.min(11, Number(month) - 1));
    return `${names[idx]} ${year}`;
  }, [status?.month]);

  const supaBytes = status?.supabase.egressBytes ?? 0;
  const supaLimit = status?.supabase.limitBytes ?? SUPABASE_EGRESS_LIMIT_BYTES;
  const supaRemaining = status?.supabase.remainingBytes ?? Math.max(0, supaLimit - supaBytes);
  const supaPct = status?.supabase.percentage ?? 0;
  const supaExhausted = status?.supabase.status === "exhausted";

  const effectiveFbReads = Math.max(sessionReads, status?.firebase.dailyReads ?? 0);
  const fbLimit = status?.firebase.dailyLimitReads ?? 50000;
  const fbPct = status?.firebase.status === "exhausted"
    ? 100
    : Math.min(100, Number(((effectiveFbReads / fbLimit) * 100).toFixed(1)));
  const fbExhausted = status?.firebase.status === "exhausted";

  const alertLevel = status?.alertLevel ?? "normal";
  const showThresholdAlert =
    alertLevel === "warning" ||
    alertLevel === "critical" ||
    alertLevel === "exhausted" ||
    fbPct >= 75 ||
    fbExhausted;

  const badgeTone =
    alertLevel === "exhausted" || alertLevel === "critical"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : alertLevel === "warning" || fbExhausted || fbPct >= 75
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const badgeLabel =
    alertLevel === "exhausted"
      ? "Limit 5 GB Tercapai"
      : alertLevel === "critical"
      ? "Kritis (>=90%)"
      : alertLevel === "warning"
      ? "Mendekati Batas (>=75%)"
      : fbExhausted
      ? "Firebase Limit Harian"
      : "Kuota Aman";

  return (
    <section
      aria-label="Quota Status"
      className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
              alertLevel === "exhausted" || alertLevel === "critical"
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : alertLevel === "warning" || fbExhausted
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-emerald-50 border-emerald-200 text-emerald-600"
            }`}
          >
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-display">
                Quota Status
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeTone}`}>
                {isLoading && !status ? "Memeriksa..." : badgeLabel}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Pemantauan egress Supabase (5 GB / bulan) &amp; kuota Firebase ({monthLabel})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => void loadQuotaStatus(true)}
            disabled={isRefreshing}
            className="h-10 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Mengecek..." : "Cek Kuota Live"}</span>
          </button>
          {onOpenStorageMenu && (
            <button
              type="button"
              onClick={onOpenStorageMenu}
              className="h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Menu Penyimpanan</span>
            </button>
          )}
          <a
            href="https://supabase.com/dashboard/org/_/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Cek Resmi Supabase</span>
          </a>
        </div>
      </div>

      {/* Proactive Warning Alert before hitting 5 GB limit */}
      {showThresholdAlert && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex items-start gap-3.5 ${
            alertLevel === "exhausted" || alertLevel === "critical"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              alertLevel === "exhausted" || alertLevel === "critical"
                ? "bg-rose-100 text-rose-600"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            {alertLevel === "exhausted" || alertLevel === "critical" ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div className="text-xs sm:text-sm leading-relaxed">
            <p className="font-black">
              {alertLevel === "exhausted"
                ? "Batas Kuota Egress 5 GB/Bulan Supabase Telah Tercapai"
                : alertLevel === "critical"
                ? `Peringatan Kritis: Pemakaian Egress Sudah ${supaPct}% dari Batas 5.00 GB!`
                : alertLevel === "warning"
                ? `Peringatan Dini: Pemakaian Egress Sudah Melewati ${supaPct}% (Mendekati 5.00 GB)`
                : "Peringatan Kuota Firebase Harian"}
            </p>
            <p className="font-medium mt-0.5 opacity-90">
              {alertLevel === "exhausted"
                ? "Penarikan data Supabase sedang dibatasi hingga siklus bulanan reset tanggal 1 bulan depan. Sistem tetap aman membaca cache lokal & Firebase."
                : alertLevel === "critical" || alertLevel === "warning"
                ? "Hindari sinkronisasi penuh berulang dalam waktu singkat dan pantau angka resmi pada dashboard Supabase."
                : "Kuota baca gratis harian Firebase (50.000/hari) mendekati atau mencapai batas, akan reset otomatis sekitar pukul 15:00 WIB."}
            </p>
          </div>
        </div>
      )}

      {/* Dual Cloud Meters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Supabase Monthly Egress Meter */}
        <div
          className={`rounded-2xl border p-5 space-y-4 ${
            supaExhausted || supaPct >= 90
              ? "bg-rose-50/40 border-rose-200/80"
              : supaPct >= 75
              ? "bg-amber-50/40 border-amber-200/80"
              : "bg-slate-50/80 border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Supabase Egress (5 GB / Bulan)
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                supaExhausted ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {supaExhausted ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Limit Tercapai</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aktif</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Terpakai Bulan Ini
              </p>
              <p
                className={`text-2xl font-black tabular-nums mt-0.5 ${
                  supaExhausted ? "text-rose-700" : "text-slate-900"
                }`}
              >
                {supaExhausted ? `5.00 GB` : formatBytes(supaBytes)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sisa Kuota
              </p>
              <p
                className={`text-base font-bold tabular-nums mt-0.5 ${
                  supaExhausted ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatBytes(supaRemaining)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${
                  supaExhausted || supaPct >= 90
                    ? "bg-rose-500"
                    : supaPct >= 75
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.max(supaBytes > 0 || supaExhausted ? 2 : 0, supaPct)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs font-semibold">
              <span
                className={`tabular-nums ${
                  supaExhausted || supaPct >= 90 ? "text-rose-600" : "text-slate-600"
                }`}
              >
                {supaPct}% dari 5.00 GB ({(status?.supabase.requests ?? 0).toLocaleString()} request)
              </span>
              <span className="text-slate-400">Reset tgl 1</span>
            </div>
          </div>
        </div>

        {/* 2. Firebase Daily Reads & Storage Meter */}
        <div
          className={`rounded-2xl border p-5 space-y-4 ${
            fbExhausted || fbPct >= 90
              ? "bg-rose-50/40 border-rose-200/80"
              : fbPct >= 75
              ? "bg-amber-50/40 border-amber-200/80"
              : "bg-slate-50/80 border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Firebase Quota (50K/Hari &amp; 5 GB)
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                fbExhausted ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {fbExhausted ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Limit Harian</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aktif</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Bacaan Hari Ini
              </p>
              <p
                className={`text-2xl font-black tabular-nums mt-0.5 ${
                  fbExhausted ? "text-rose-700" : "text-slate-900"
                }`}
              >
                {fbExhausted ? "50.000+" : effectiveFbReads.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Storage Berkas
              </p>
              <p className="text-base font-bold text-blue-600 tabular-nums mt-0.5">
                {storageUsedFormatted} / 5 GB ({storagePercentage}%)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${
                  fbExhausted || fbPct >= 90
                    ? "bg-rose-500"
                    : fbPct >= 75
                    ? "bg-amber-500"
                    : "bg-blue-600"
                }`}
                style={{ width: `${Math.max(effectiveFbReads > 0 || fbExhausted ? 2 : 0, fbPct)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs font-semibold">
              <span
                className={`tabular-nums ${
                  fbExhausted || fbPct >= 90 ? "text-rose-600" : "text-slate-600"
                }`}
              >
                {fbPct}% dari 50.000 bacaan • {sessionWrites.toLocaleString()} tulis sesi
              </span>
              <span className="text-slate-400">Reset ~15:00 WIB</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
