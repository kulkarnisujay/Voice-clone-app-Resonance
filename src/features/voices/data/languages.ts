import locales from "locale-codes";

export const LANGUAGE_OPTIONS = locales.all
  .filter((l) => l.tag && l.tag.includes("-") && l.name)
  .map((l) => ({
    value: l.tag,
    label: l.location ? `${l.name} (${l.location})` : l.name,
    langCode: l.tag.split("-")[0], // 'en', 'es', etc.
  }));
