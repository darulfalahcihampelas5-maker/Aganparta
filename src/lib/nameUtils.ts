const PREFIX_SECOND_NAME_TRIGGERS = new Set([
  "muhammad",
  "muhamad",
  "moch",
  "mohammad",
  "mohamad",
  "muh",
]);

/**
 * Mengambil nama panggilan siswa untuk sapaan di SiPinter App.
 * Jika kata pertama diawali "Muhammad", "Muhamad", atau "Moch" (beserta variasi ejaan/titik),
 * otomatis mengambil kata kedua sebagai nama panggilan.
 */
export function getDisplayCallName(fullName?: string): string {
  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return "Siswa";
  }
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Siswa";

  const firstNormalized = words[0].toLowerCase().replace(/[.,]+$/g, "");
  let selected = words[0];

  if (PREFIX_SECOND_NAME_TRIGGERS.has(firstNormalized) && words.length > 1) {
    selected = words[1];
  }

  const cleaned = selected.replace(/^[.,]+|[.,]+$/g, "");
  if (!cleaned) return "Siswa";

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}
