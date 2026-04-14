import type { CookieOptions, Request } from "express";

function _isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);

  // SECURITY: sameSite policy
  //   - Non-HTTPS (dev / HTTP-only deploys): 'lax' — prevents CSRF while
  //     allowing normal same-site navigation. 'none' would be rejected by
  //     browsers without Secure anyway, so 'lax' is the safe default.
  //   - HTTPS (production / staging behind TLS): 'none' is required when the
  //     frontend and API are served from different origins (e.g. Vite dev
  //     server on :5173 talking to Express on :3000, or a CDN-fronted SPA
  //     talking to an API subdomain). 'none' MUST be paired with Secure=true,
  //     which is enforced by the `secure` flag below.
  //   NOTE: A CSRF-token layer is planned (separate coordinated change) to
  //   provide defence-in-depth on top of this sameSite policy.
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
