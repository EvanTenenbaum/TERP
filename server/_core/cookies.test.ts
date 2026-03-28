import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

describe("getSessionCookieOptions", () => {
  it("uses lax non-secure cookies for local http requests", () => {
    const req = {
      protocol: "http",
      headers: {},
    };

    expect(getSessionCookieOptions(req as never)).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });

  it("uses secure none cookies for https requests", () => {
    const req = {
      protocol: "https",
      headers: {},
    };

    expect(getSessionCookieOptions(req as never)).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });

  it("treats forwarded https requests as secure", () => {
    const req = {
      protocol: "http",
      headers: { "x-forwarded-proto": "https" },
    };

    expect(getSessionCookieOptions(req as never)).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });
});
