const fs = require('fs');
const path = require('path');
const DatabaseUtils = require('../utils/dbUtils.js');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfUtcDay = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const addDays = (date, days) => new Date(date.getTime() + (days * MS_PER_DAY));

const isoDate = (date) => date.toISOString().slice(0, 10);

const safePercent = (numerator, denominator) => {
  if (!denominator) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
};

const percentDelta = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
};

const sortEntriesDescending = (record) => Object.entries(record).sort((left, right) => right[1] - left[1]);

class AdminKpiReportService {
  constructor(db = null) {
    this.db = db || new DatabaseUtils();
    this.reportsDir = path.join(__dirname, '..', 'reports', 'admin-kpi');
  }

  setDatabase(db) {
    this.db = db;
  }

  parseMetadata(metadata) {
    if (!metadata) {
      return {};
    }

    if (typeof metadata === 'object') {
      return metadata;
    }

    try {
      return JSON.parse(metadata);
    } catch (_error) {
      return {};
    }
  }

  async loadRelevantEvents(previousStartMs, currentEndMs) {
    const rows = await this.db.getAll(
      `SELECT event, category, action, label, value, user_id, session_id, timestamp, metadata
       FROM analytics_events
       WHERE timestamp >= ? AND timestamp < ?
       ORDER BY timestamp DESC`,
      [previousStartMs, currentEndMs]
    );

    return rows
      .map((row) => ({
        event: row.event,
        category: row.category,
        action: row.action,
        label: row.label,
        value: row.value,
        userId: row.user_id,
        sessionId: row.session_id,
        timestamp: Number(row.timestamp),
        metadata: this.parseMetadata(row.metadata)
      }))
      .filter((row) => {
        const goalName = row.metadata?.goalName;
        return (
          (row.event === 'user_action' && (row.action === 'landing_cta_click' || row.action === 'auth_cta_click')) ||
          (row.event === 'conversion' && (goalName === 'landing_register_intent' || goalName === 'navbar_signup_intent'))
        );
      });
  }

  summarizePeriod(events, periodStartMs) {
    const currentEvents = events.filter((event) => event.timestamp >= periodStartMs);
    const landingClicks = currentEvents.filter((event) => event.event === 'user_action' && event.action === 'landing_cta_click');
    const authClicks = currentEvents.filter((event) => event.event === 'user_action' && event.action === 'auth_cta_click');
    const conversions = currentEvents.filter((event) => event.event === 'conversion');

    const landingRegisterIntent = conversions.filter((event) => event.metadata?.goalName === 'landing_register_intent').length;
    const navbarSignupIntent = conversions.filter((event) => event.metadata?.goalName === 'navbar_signup_intent').length;

    const sectionCounts = {};
    const roleIntentCounts = {};
    const ctaTargetCounts = {};
    const authPlacementCounts = {};
    const authPlacementCtaCounts = {};

    for (const event of landingClicks) {
      const section = event.metadata?.section || 'unknown';
      const roleIntent = event.metadata?.roleIntent || 'unknown';
      const target = event.label || 'unknown';

      sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      roleIntentCounts[roleIntent] = (roleIntentCounts[roleIntent] || 0) + 1;
      ctaTargetCounts[target] = (ctaTargetCounts[target] || 0) + 1;
    }

    for (const event of authClicks) {
      const placement = event.metadata?.placement || 'unknown';
      const cta = event.label || 'unknown';
      const placementKey = `${placement}:${cta}`;

      authPlacementCounts[placement] = (authPlacementCounts[placement] || 0) + 1;
      authPlacementCtaCounts[placementKey] = (authPlacementCtaCounts[placementKey] || 0) + 1;
    }

    const qaSample = [...landingClicks, ...authClicks, ...conversions]
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 50);

    const qaMissing = qaSample.filter((event) => {
      if (event.action === 'landing_cta_click') {
        return !event.metadata?.section || !event.metadata?.destination;
      }

      if (event.action === 'auth_cta_click') {
        return !event.metadata?.placement;
      }

      if (event.event === 'conversion') {
        return !event.metadata?.goalName;
      }

      return false;
    }).length;

    return {
      landingClicks: landingClicks.length,
      authClicks: authClicks.length,
      landingRegisterIntent,
      navbarSignupIntent,
      totalRegisterIntent: landingRegisterIntent + navbarSignupIntent,
      landingIntentRatePercent: safePercent(landingRegisterIntent, landingClicks.length),
      sectionCounts,
      roleIntentCounts,
      ctaTargetCounts,
      authPlacementCounts,
      authPlacementCtaCounts,
      heroSharePercent: safePercent(sectionCounts.hero || 0, landingClicks.length),
      qaSampleSize: qaSample.length,
      qaMissing,
      qaMissingPercent: safePercent(qaMissing, qaSample.length)
    };
  }

  buildFlags(current, previous) {
    const flags = [];
    const totalIntentDelta = percentDelta(current.totalRegisterIntent, previous.totalRegisterIntent);
    const parentCurrent = current.roleIntentCounts['Parent/Guardian'] || 0;
    const parentPrevious = previous.roleIntentCounts['Parent/Guardian'] || 0;
    const parentDelta = percentDelta(parentCurrent, parentPrevious);
    const mobileSignupClicks = current.authPlacementCtaCounts['mobile_topbar:signup'] || 0;
    const mobileLoginClicks = current.authPlacementCtaCounts['mobile_topbar:login'] || 0;

    if (totalIntentDelta < -20) {
      flags.push(`Escalation: total register intent down ${Math.abs(totalIntentDelta)}% week-over-week.`);
    } else if (totalIntentDelta < -15) {
      flags.push(`Watch: total register intent down ${Math.abs(totalIntentDelta)}% week-over-week.`);
    }

    if (parentDelta < -25) {
      flags.push(`Escalation: parent intent down ${Math.abs(parentDelta)}% week-over-week.`);
    } else if (parentDelta < -20) {
      flags.push(`Watch: parent intent down ${Math.abs(parentDelta)}% week-over-week.`);
    }

    if (current.heroSharePercent < 40) {
      flags.push(`Watch: hero CTA share is ${current.heroSharePercent}% and should remain above 40%.`);
    }

    if (mobileLoginClicks > 0 && mobileSignupClicks < (mobileLoginClicks * 0.5)) {
      flags.push(`Watch: mobile signup clicks (${mobileSignupClicks}) are below 50% of mobile login clicks (${mobileLoginClicks}).`);
    }

    if (current.qaMissingPercent > 5) {
      flags.push(`Escalation: metadata QA failure rate is ${current.qaMissingPercent}%.`);
    }

    if (flags.length === 0) {
      flags.push('No escalation flags triggered for this reporting period.');
    }

    return flags;
  }

  buildMarkdown(report) {
    const current = report.currentWeek;
    const previous = report.previousWeek;

    const topTargets = sortEntriesDescending(current.ctaTargetCounts).slice(0, 10);
    const sections = sortEntriesDescending(current.sectionCounts);
    const roleIntent = sortEntriesDescending(current.roleIntentCounts);
    const authPlacement = sortEntriesDescending(current.authPlacementCtaCounts);

    return [
      `# Admin Weekly KPI Report`,
      '',
      `Period: ${report.period.current.start} to ${report.period.current.endExclusive} UTC`,
      `Compared with: ${report.period.previous.start} to ${report.period.previous.endExclusive} UTC`,
      `Generated at: ${report.generatedAt}`,
      '',
      '## Headline Metrics',
      '',
      `- Total register intent: ${current.totalRegisterIntent} (${percentDelta(current.totalRegisterIntent, previous.totalRegisterIntent)}% vs prior week)`,
      `- Landing register intent: ${current.landingRegisterIntent} (${percentDelta(current.landingRegisterIntent, previous.landingRegisterIntent)}% vs prior week)`,
      `- Navbar signup intent: ${current.navbarSignupIntent} (${percentDelta(current.navbarSignupIntent, previous.navbarSignupIntent)}% vs prior week)`,
      `- Landing CTA clicks: ${current.landingClicks}`,
      `- Landing intent rate: ${current.landingIntentRatePercent}%`,
      `- Hero section share: ${current.heroSharePercent}%`,
      '',
      '## Flags',
      '',
      ...report.flags.map((flag) => `- ${flag}`),
      '',
      '## Landing CTA Clicks by Section',
      '',
      ...sections.map(([key, value]) => `- ${key}: ${value}`),
      '',
      '## Landing CTA Clicks by Role Intent',
      '',
      ...roleIntent.map(([key, value]) => `- ${key}: ${value}`),
      '',
      '## Top CTA Targets',
      '',
      ...topTargets.map(([key, value]) => `- ${key}: ${value}`),
      '',
      '## Auth CTA Clicks by Placement',
      '',
      ...authPlacement.map(([key, value]) => `- ${key}: ${value}`),
      '',
      '## Instrumentation QA',
      '',
      `- Sample size: ${current.qaSampleSize}`,
      `- Missing metadata rows: ${current.qaMissing}`,
      `- Missing metadata rate: ${current.qaMissingPercent}%`,
      '',
      '## Recommended Admin Actions',
      '',
      '- Review hero CTA performance first if hero share drops below 40%.',
      '- Investigate parent/guardian flow immediately if parent intent drops materially week-over-week.',
      '- Compare mobile login vs signup pressure if mobile top-bar signup underperforms.',
      '- Treat QA metadata failures above 5% as an instrumentation bug, not a product signal.',
      ''
    ].join('\n');
  }

  async generateWeeklyReport(options = {}) {
    const anchorDate = options.anchorDate ? new Date(options.anchorDate) : new Date();
    const currentEnd = startOfUtcDay(anchorDate);
    const currentStart = addDays(currentEnd, -7);
    const previousStart = addDays(currentStart, -7);

    const events = await this.loadRelevantEvents(previousStart.getTime(), currentEnd.getTime());
    const previousWeek = this.summarizePeriod(events, previousStart.getTime());
    const currentWeek = this.summarizePeriod(events, currentStart.getTime());

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        previous: {
          start: isoDate(previousStart),
          endExclusive: isoDate(currentStart)
        },
        current: {
          start: isoDate(currentStart),
          endExclusive: isoDate(currentEnd)
        }
      },
      currentWeek,
      previousWeek,
      flags: this.buildFlags(currentWeek, previousWeek)
    };

    fs.mkdirSync(this.reportsDir, { recursive: true });

    const baseName = `${report.period.current.start}_weekly_admin_kpi_report`;
    const markdownPath = path.join(this.reportsDir, `${baseName}.md`);
    const jsonPath = path.join(this.reportsDir, `${baseName}.json`);
    const latestMarkdownPath = path.join(this.reportsDir, 'latest.md');
    const latestJsonPath = path.join(this.reportsDir, 'latest.json');

    const markdown = this.buildMarkdown(report);
    const json = JSON.stringify(report, null, 2);

    fs.writeFileSync(markdownPath, markdown, 'utf8');
    fs.writeFileSync(jsonPath, json, 'utf8');
    fs.writeFileSync(latestMarkdownPath, markdown, 'utf8');
    fs.writeFileSync(latestJsonPath, json, 'utf8');

    return {
      report,
      markdownPath,
      jsonPath,
      latestMarkdownPath,
      latestJsonPath
    };
  }
}

module.exports = new AdminKpiReportService();
module.exports.AdminKpiReportService = AdminKpiReportService;
