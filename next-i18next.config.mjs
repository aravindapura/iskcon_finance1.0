const nextI18NextConfig = {
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ru"]
  },
  reloadOnPrerender: process.env.NODE_ENV === "development"
};

export default nextI18NextConfig;
