export { getServerTranslation, getAvailableLocales, getDefaultLocale } from "./server";
export type { ServerTranslationResult, TranslationNamespaces } from "./server";
export {
  TranslationProvider,
  useCurrentLocale,
  useTranslation
} from "./client";
