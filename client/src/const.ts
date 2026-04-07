export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
const appTitleFromEnv = import.meta.env.VITE_APP_TITLE;
export const APP_TITLE =
  !appTitleFromEnv || /^%[A-Z0-9_]+%$/i.test(appTitleFromEnv)
    ? "TERP"
    : appTitleFromEnv;
export const APP_LOGO = import.meta.env.VITE_APP_LOGO || "/terp-icon.png";
// Return login path for authentication
export const getLoginUrl = () => {
  return "/login";
};
