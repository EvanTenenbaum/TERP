export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "TERP";
export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO || "/terp-icon.png";
// Return login path for authentication
export const getLoginUrl = () => {
  return "/login";
};
