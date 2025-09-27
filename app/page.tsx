import { redirect } from "next/navigation";

import { defaultLocale } from "@/lib/i18n/settings";

const RootPage = () => {
  redirect(`/${defaultLocale}`);
};

export default RootPage;
