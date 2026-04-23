#!/usr/bin/env python3
"""
Headless capture of every page in page_inventory.json using Playwright.

Strategy:
1. Use the existing session by reusing the Manus browser's cookies, OR log in once via API.
   Since we already have `terp-qa-verifier` / `terp-sandbox-tests` skills that do auth via tRPC
   cookie capture, we'll do a fresh login with qa.superadmin@terp.test credentials set in env,
   falling back to a known dev-credential flow.
2. For each page, navigate, wait for network idle + a DOM-ready sentinel, screenshot at 1440x900.
3. For FULL depth pages, also take a scrolled screenshot after scrolling by one viewport.
4. Write a runtime note file per page with the <h1>/breadcrumbs/visible section titles harvested
   from the DOM.

Run: python3 capture_all.py
"""
import asyncio
import json
import os
import re
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = os.environ.get("TERP_BASE", "https://terp-staging-yicld.ondigitalocean.app")
USERNAME = os.environ.get("TERP_USERNAME")  # set via env, never commit a value
PASSWORD = os.environ.get("TERP_PASSWORD")  # set via env, never commit a value
if not USERNAME or not PASSWORD:
    raise SystemExit("Set TERP_USERNAME and TERP_PASSWORD env vars before running.")

SCREENSHOT_DIR = ROOT / "screenshots_all"
NOTES_DIR = ROOT / "runtime_notes"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
NOTES_DIR.mkdir(parents=True, exist_ok=True)

INVENTORY = json.loads((ROOT / "scripts/page_inventory.json").read_text())


async def login(page):
    print(f"[login] goto {BASE_URL}/login", file=sys.stderr)
    await page.goto(f"{BASE_URL}/login", wait_until="load", timeout=60000)
    await page.wait_for_timeout(1500)
    # Try common selectors
    username_sel = 'input[name="username"], input[type="text"]'
    password_sel = 'input[name="password"], input[type="password"]'
    await page.wait_for_selector(username_sel, timeout=10000)
    await page.fill(username_sel, USERNAME)
    await page.fill(password_sel, PASSWORD)
    # Click submit
    submit_candidates = ['button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Sign in")', 'button:has-text("Login")']
    for sel in submit_candidates:
        btn = await page.query_selector(sel)
        if btn:
            await btn.click()
            break
    else:
        await page.press(password_sel, "Enter")
    # Wait for redirect off /login
    try:
        await page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
    except Exception:
        pass


async def capture_page(context, item):
    key = item["key"]
    route = item["route"]
    depth = item["depth"]
    page = await context.new_page()
    await page.set_viewport_size({"width": 1440, "height": 900})
    url = f"{BASE_URL}{route}"
    try:
        await page.goto(url, wait_until="load", timeout=60000)
        # Wait for either networkidle or fallback timeout
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        # Small settle for charts / skeletons
        await page.wait_for_timeout(1500)
    except Exception as e:
        print(f"[{key}] nav failed: {e}", file=sys.stderr)

    # Capture
    out_path = SCREENSHOT_DIR / f"{key}.webp"
    await page.screenshot(path=str(out_path), type="jpeg" if False else "png", full_page=False)
    # Convert png to webp via Pillow (Playwright has no webp builtin)
    # Actually Playwright supports only png/jpeg; we keep png and convert later.
    # Rename to .png for clarity
    png_path = SCREENSHOT_DIR / f"{key}.png"
    out_path.rename(png_path)
    print(f"[{key}] captured {png_path.name} ({depth})")

    # Second capture for full-depth pages: scrolled
    if depth == "full":
        try:
            await page.evaluate("window.scrollBy(0, window.innerHeight * 0.9)")
            await page.wait_for_timeout(800)
            scrolled_path = SCREENSHOT_DIR / f"{key}_scrolled.png"
            await page.screenshot(path=str(scrolled_path), full_page=False)
            print(f"[{key}] captured {scrolled_path.name} (scrolled)")
        except Exception as e:
            print(f"[{key}] scroll capture failed: {e}", file=sys.stderr)

    # Harvest DOM signals for runtime note
    try:
        title = await page.title()
    except Exception:
        title = ""
    try:
        h1s = await page.evaluate("() => Array.from(document.querySelectorAll('h1')).map(e => e.innerText.trim()).filter(Boolean)")
        h2s = await page.evaluate("() => Array.from(document.querySelectorAll('h2')).map(e => e.innerText.trim()).filter(Boolean).slice(0,10)")
        tab_labels = await page.evaluate(
            "() => Array.from(document.querySelectorAll('[role=\"tab\"]')).map(e => e.innerText.trim()).filter(Boolean).slice(0,15)"
        )
        visible_buttons = await page.evaluate(
            "() => Array.from(document.querySelectorAll('button')).map(e => e.innerText.trim()).filter(t => t && t.length < 40).slice(0,25)"
        )
        final_url = page.url
    except Exception as e:
        h1s = h2s = tab_labels = visible_buttons = []
        final_url = url

    # Write note
    note = (NOTES_DIR / f"{key}.md")
    note.write_text(
        f"""Page: {item['name']} ({depth})
Route requested: {route}
Final URL: {final_url}
Title: {title}

H1: {h1s}
H2 (first 10): {h2s}
Tabs: {tab_labels}
Buttons (first 25): {visible_buttons}
"""
    )
    await page.close()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chromium", headless=True, args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"])
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            ignore_https_errors=True,
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        )
        page = await context.new_page()
        await login(page)
        await page.close()

        # Capture all pages serially (parallel would fight over state on same origin)
        for item in INVENTORY:
            await capture_page(context, item)

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
