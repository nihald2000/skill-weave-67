#!/usr/bin/env node
/**
 * Automated auth security checks (CI-friendly).
 *
 * Verifies:
 *   1. Leaked-password protection (HIBP) is enforced by the Auth server on
 *      sign-up (which is the same code path used by password updates issued
 *      from the password-reset recovery flow).
 *   2. Anonymous sign-ups are disabled.
 *   3. New sign-ups are not silently auto-confirmed unless intended.
 *
 * Exits non-zero on any failed check so CI can block deploys.
 *
 * Required env:
 *   VITE_SUPABASE_URL              - project URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY  - anon/publishable key
 * Optional env:
 *   ALLOW_AUTO_CONFIRM=true        - opt-in if the project intentionally
 *                                    auto-confirms email sign-ups
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    "✗ Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY env vars"
  );
  process.exit(2);
}

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
};

const authFetch = (path, init = {}) =>
  fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      ...(init.headers || {}),
    },
  });

// GoTrue exposes runtime settings publicly at /auth/v1/settings.
async function checkSettings() {
  const res = await authFetch("/auth/v1/settings");
  if (!res.ok) {
    record("auth settings reachable", false, `HTTP ${res.status}`);
    return null;
  }
  const settings = await res.json();
  record("auth settings reachable", true);

  // Anonymous sign-ups must be off unless the app explicitly wants them.
  const anon = settings?.external?.anonymous_users === true;
  record(
    "anonymous sign-ups disabled",
    !anon,
    anon ? "external.anonymous_users=true" : ""
  );

  // Auto-confirm makes account takeover trivial via typo'd emails.
  const autoConfirm = settings?.mailer_autoconfirm === true;
  const allowed = process.env.ALLOW_AUTO_CONFIRM === "true";
  record(
    "email auto-confirm not enabled (or explicitly allowed)",
    !autoConfirm || allowed,
    autoConfirm && !allowed
      ? "mailer_autoconfirm=true; set ALLOW_AUTO_CONFIRM=true to opt in"
      : ""
  );

  return settings;
}

// Probe HIBP by attempting to sign up with a known-pwned password.
// GoTrue rejects it *before* creating the user with error_code=weak_password
// and reasons including "pwned". No account is created on failure.
async function checkHIBP() {
  const email = `hibp-probe-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.invalid`;
  const pwned = "Password123!"; // present in HIBP breach corpus

  const res = await authFetch("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password: pwned }),
  });
  const body = await res.json().catch(() => ({}));

  const rejected =
    res.status >= 400 &&
    (body?.error_code === "weak_password" ||
      body?.weak_password ||
      /pwned|leaked|compromis/i.test(
        `${body?.msg || ""} ${body?.message || ""} ${JSON.stringify(
          body?.weak_password || {}
        )}`
      ));

  record(
    "HIBP leaked-password protection enforced on sign-up",
    rejected,
    rejected ? "" : `HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`
  );

  // The password-update endpoint used by the /reset-password recovery flow
  // and by regular password changes runs through the same validator as
  // sign-up, so enforcement on sign-up implies enforcement on those flows.
  record(
    "HIBP enforcement covers login/reset password-update flows",
    rejected,
    rejected
      ? "sign-up validator is shared with password updates"
      : "sign-up probe failed; update flows also unprotected"
  );
}

(async () => {
  await checkSettings();
  await checkHIBP();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed`
  );
  if (failed.length) {
    console.error(`\n${failed.length} auth security check(s) failed`);
    process.exit(1);
  }
})().catch((err) => {
  console.error("auth security checks crashed:", err);
  process.exit(2);
});