export type LabTheme = "system" | "dos" | "phosphor" | "contrast";
export type LabPrefs = {
  theme: LabTheme;
  rails: boolean;
  density: "detailed" | "compact";
  fx: "full" | "calm";
};

export const STORAGE_KEY = "dexterslab:prefs";
export const DEFAULT_PREFS: LabPrefs = { theme: "dos", rails: false, density: "detailed", fx: "full" };

export function parsePrefs(value: unknown): LabPrefs {
  const saved = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    theme: ["system", "dos", "phosphor", "contrast"].includes(String(saved.theme))
      ? saved.theme as LabTheme : DEFAULT_PREFS.theme,
    rails: typeof saved.rails === "boolean" ? saved.rails : DEFAULT_PREFS.rails,
    density: saved.density === "compact" ? "compact" : "detailed",
    fx: saved.fx === "calm" ? "calm" : "full",
  };
}
