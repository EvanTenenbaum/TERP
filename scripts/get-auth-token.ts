/**
 * Get Auth Token for AI Agents
 *
 * Usage:
 *   tsx scripts/get-auth-token.ts <email> <password> [base-url]
 *
 * Examples:
 *   tsx scripts/get-auth-token.ts test-admin@terp-app.local TestAdmin123! https://terp.example.com
 *   pnpm get:auth-token test-superadmin@terp-app.local TestSuperAdmin123!
 *
 * This script calls the auth.getTestToken endpoint to get a session token
 * that can be used in browser automation for E2E testing.
 *
 * Note: Requires ENABLE_TEST_AUTH=true in production environments
 */

const email = process.argv[2];
const password = process.argv[3];
const baseUrl = process.argv[4] || "http://localhost:5000";

if (!email || !password) {
  console.error(
    "Usage: tsx scripts/get-auth-token.ts <email> <password> [base-url]"
  );
  console.error("\nExamples:");
  console.error(
    "  tsx scripts/get-auth-token.ts admin@example.com MyPassword123!"
  );
  console.error(
    "  tsx scripts/get-auth-token.ts test-admin@terp-app.local TestAdmin123! https://terp-app.example.com"
  );
  console.error("\nDefault base-url: http://localhost:5000");
  process.exit(1);
}

interface TestTokenResponse {
  result: {
    data: {
      json: {
        token: string;
        cookieName: string;
        user: {
          id: number;
          email: string | null;
          role: string;
        };
      };
    };
  };
}

async function getToken() {
  console.info(`🔐 Getting auth token for: ${email}`);
  console.info(`   Server: ${baseUrl}\n`);

  try {
    const response = await fetch(`${baseUrl}/api/trpc/auth.getTestToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: { email, password },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Failed to get token");
      console.error(`   Status: ${response.status} ${response.statusText}`);

      try {
        const errorJson = JSON.parse(text);
        if (errorJson.error?.message) {
          console.error(`   Error: ${errorJson.error.message}`);
        } else {
          console.error(`   Response: ${text}`);
        }
      } catch {
        console.error(`   Response: ${text}`);
      }

      if (response.status === 403) {
        console.error("\n💡 Hint: Test auth may be disabled in production.");
        console.error("   Set ENABLE_TEST_AUTH=true in the environment.");
      }

      process.exit(1);
    }

    const data = (await response.json()) as TestTokenResponse;
    const result = data.result?.data?.json;

    if (!result?.token) {
      console.error("❌ No token in response:", JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.info("✅ Token obtained successfully!\n");
    console.info("Cookie Name:", result.cookieName);
    console.info("User:", result.user.email, `(${result.user.role})`);
    console.info("\n" + "─".repeat(60));
    console.info("TOKEN:");
    console.info(result.token);
    console.info("─".repeat(60));

    // Extract domain from baseUrl
    let domain: string;
    try {
      const url = new URL(baseUrl);
      domain = url.hostname;
    } catch {
      domain = "localhost";
    }

    console.info("\nFor Playwright/Puppeteer:");
    console.info(`
await context.addCookies([{
  name: '${result.cookieName}',
  value: '${result.token}',
  domain: '${domain}',
  path: '/'
}]);
`);

    console.info("For curl:");
    console.info(`
curl -H "Cookie: ${result.cookieName}=${result.token}" ${baseUrl}/api/trpc/auth.me
`);
  } catch (error) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : String(error)
    );

    if (error instanceof Error && error.message.includes("fetch")) {
      console.error("\n💡 Hint: Make sure the server is running at", baseUrl);
    }

    process.exit(1);
  }
}

getToken().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
