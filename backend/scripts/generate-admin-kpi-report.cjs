#!/usr/bin/env node

const adminKpiReportService = require('../services/adminKpiReportService.cjs');

const readArg = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) {
    return null;
  }

  return process.argv[index + 1];
};

const anchorDate = readArg('anchor-date') || null;
const jsonOnly = process.argv.includes('--json');

(async () => {
  try {
    const result = await adminKpiReportService.generateWeeklyReport({ anchorDate });

    if (jsonOnly) {
      process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
      return;
    }

    console.log('Admin KPI report generated successfully.');
    console.log(`Markdown: ${result.markdownPath}`);
    console.log(`JSON: ${result.jsonPath}`);
    console.log(`Latest markdown: ${result.latestMarkdownPath}`);
    console.log(`Latest JSON: ${result.latestJsonPath}`);
    console.log(`Reporting period: ${result.report.period.current.start} to ${result.report.period.current.endExclusive} UTC`);
  } catch (error) {
    console.error('Failed to generate admin KPI report:', error.message || error);
    process.exit(1);
  }
})();
