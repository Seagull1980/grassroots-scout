#!/usr/bin/env node

// Smoke test for authenticated invitation endpoints without long shell one-liners.
// Usage:
//   node backend/scripts/invitation-smoke-test.js --email you@example.com --password "yourPassword"
// Optional:
//   --base https://grassroots-scout-backend-production-7b21.up.railway.app

const DEFAULT_BASE = 'https://grassroots-scout-backend-production-7b21.up.railway.app';

function readArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) {
    return null;
  }
  return process.argv[idx + 1];
}

function exitWithUsage() {
  console.log('Missing required arguments.');
  console.log('Usage: node backend/scripts/invitation-smoke-test.js --email you@example.com --password "yourPassword" [--base https://... ]');
  process.exit(1);
}

async function safeText(response) {
  try {
    return await response.text();
  } catch (_error) {
    return '<unable to read response body>';
  }
}

async function run() {
  const email = readArg('email') || process.env.SMOKE_EMAIL;
  const password = readArg('password') || process.env.SMOKE_PASSWORD;
  const base = (readArg('base') || process.env.SMOKE_BASE || DEFAULT_BASE).replace(/\/+$/, '');

  if (!email || !password) {
    exitWithUsage();
  }

  console.log(`Base URL: ${base}`);
  console.log(`Login user: ${email}`);

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const loginBody = await safeText(loginRes);
  console.log(`\nLOGIN HTTP: ${loginRes.status}`);
  console.log(loginBody.slice(0, 400));

  if (loginRes.status !== 200) {
    process.exit(2);
  }

  const setCookie = loginRes.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];

  if (!cookie) {
    console.log('\nNo auth cookie returned from login.');
    process.exit(3);
  }

  const meRes = await fetch(`${base}/api/auth/me`, {
    method: 'GET',
    headers: { Cookie: cookie }
  });
  const meBody = await safeText(meRes);
  console.log(`\nME HTTP: ${meRes.status}`);
  console.log(meBody.slice(0, 300));

  const acceptRes = await fetch(`${base}/api/invitations/123456789/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: '{}'
  });
  const acceptBody = await safeText(acceptRes);
  console.log(`\nACCEPT HTTP: ${acceptRes.status}`);
  console.log(acceptBody.slice(0, 350));

  const rejectRes = await fetch(`${base}/api/invitations/123456789/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: '{}'
  });
  const rejectBody = await safeText(rejectRes);
  console.log(`\nREJECT HTTP: ${rejectRes.status}`);
  console.log(rejectBody.slice(0, 350));

  const pass = meRes.status === 200
    && acceptRes.status !== 500
    && rejectRes.status !== 500;

  console.log(`\nSMOKE RESULT: ${pass ? 'PASS' : 'CHECK_REQUIRED'}`);
  process.exit(pass ? 0 : 4);
}

run().catch((error) => {
  console.error('\nSmoke test failed with runtime error:');
  console.error(error?.message || error);
  process.exit(10);
});
