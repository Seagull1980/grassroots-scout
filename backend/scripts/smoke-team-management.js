/*
  Non-destructive smoke checks for coach team-management routes.

  Required env vars:
  - SMOKE_BASE_URL   e.g. https://your-prod-domain.com
  - SMOKE_TOKEN      Bearer token for a coach account

  Optional:
  - SMOKE_TIMEOUT_MS (default 15000)
*/

const baseUrl = (process.env.SMOKE_BASE_URL || '').replace(/\/+$/, '');
const token = process.env.SMOKE_TOKEN || '';
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15000);

if (!baseUrl) {
  console.error('Missing SMOKE_BASE_URL');
  process.exit(1);
}

if (!token) {
  console.error('Missing SMOKE_TOKEN');
  process.exit(1);
}

const authHeaders = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...authHeaders
      },
      signal: controller.signal
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function pass(label) {
  console.log(`PASS: ${label}`);
}

function fail(label, details) {
  console.error(`FAIL: ${label}`);
  if (details) {
    console.error(details);
  }
}

async function run() {
  let failed = false;

  const health = await request('/api/health', { method: 'GET' });
  if (health.ok) {
    pass('/api/health');
  } else {
    failed = true;
    fail('/api/health', health);
  }

  const teams = await request('/api/teams', { method: 'GET' });
  if (teams.ok && Array.isArray(teams.data?.teams)) {
    pass('/api/teams returns team list');
  } else {
    failed = true;
    fail('/api/teams returns team list', teams);
  }

  const rosters = await request('/api/team-rosters', { method: 'GET' });
  if (rosters.ok && Array.isArray(rosters.data?.rosters)) {
    pass('/api/team-rosters returns roster list');
  } else {
    failed = true;
    fail('/api/team-rosters returns roster list', rosters);
  }

  const rosterList = Array.isArray(rosters.data?.rosters) ? rosters.data.rosters : [];
  if (rosterList.length > 0) {
    const rosterId = rosterList[0].id;

    const rosterDetail = await request(`/api/team-rosters/${rosterId}`, { method: 'GET' });
    if (rosterDetail.ok && rosterDetail.data?.roster) {
      pass(`/api/team-rosters/${rosterId} detail`);
    } else {
      failed = true;
      fail(`/api/team-rosters/${rosterId} detail`, rosterDetail);
    }

    const analysis = await request(`/api/team-rosters/${rosterId}/position-analysis`, { method: 'GET' });
    if (analysis.ok && Array.isArray(analysis.data?.gaps) && analysis.data?.summary) {
      pass(`/api/team-rosters/${rosterId}/position-analysis`);
    } else {
      failed = true;
      fail(`/api/team-rosters/${rosterId}/position-analysis`, analysis);
    }
  } else {
    console.log('INFO: No rosters found for coach; skipped roster detail/analysis checks.');
  }

  const coachSearch = await request('/api/coaches/search?q=coach', { method: 'GET' });
  if (coachSearch.ok && Array.isArray(coachSearch.data?.coaches)) {
    pass('/api/coaches/search returns coach list');
  } else {
    failed = true;
    fail('/api/coaches/search returns coach list', coachSearch);
  }

  if (failed) {
    process.exit(1);
  }

  console.log('All team-management smoke checks passed.');
}

run().catch((error) => {
  console.error('Smoke check crashed:', error);
  process.exit(1);
});
