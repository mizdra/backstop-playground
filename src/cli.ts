#!/usr/bin/env -S ts-node

import backstop, { JSONReport, Options } from 'backstopjs';
import { readFile } from 'fs/promises';
import { config } from './backstopConfig';

const options = {
  // M1 Mac だと動かないので docker 経由をやめる
  // ref: https://github.com/garris/BackstopJS/issues/1300
  // docker: true,
  config,
};

const jsonReportPath = config.paths.json_report;

async function readReport(): Promise<JSONReport> {
  const jsonReport = await readFile(jsonReportPath, 'utf8');
  return JSON.parse(jsonReport);
}

function filterOptionsByScenarioLabels(options: Options, scenarioLabels: string[]): Options {
  if (options.config === undefined) throw new Error('options.config is required');
  if (typeof options.config === 'string') throw new Error('options.config must be an object');
  const { scenarios } = options.config;
  const filteredScenarios = scenarios.filter((scenario) => scenarioLabels.includes(scenario.label));
  return {
    ...options,
    config: {
      ...options.config,
      scenarios: filteredScenarios,
    },
  };
}

async function runTest(filterScenarioLabels?: string[]): Promise<string[]> {
  const customOptions = filterScenarioLabels
    ? filterOptionsByScenarioLabels(this.options, filterScenarioLabels)
    : options;
  await backstop('test', customOptions).catch((error: unknown) => {
    if (error instanceof Error && error.message.startsWith('Mismatch errors found.')) {
      // noop
    } else {
      console.error('INTERNAL BACKSTOPJS ERROR OCCURRED!');
      console.error(error);
      process.exit(1);
    }
  });
  const report = await readReport();
  return report.tests.filter((test) => test.status === 'fail').map((test) => test.pair.label);
}

async function runReference(filterScenarioLabels?: string[]): Promise<void> {
  const customOptions = filterScenarioLabels
    ? filterOptionsByScenarioLabels(this.options, filterScenarioLabels)
    : options;
  await backstop('reference', customOptions);
}

async function main() {
  if (process.argv.includes('--reference')) {
    await backstop('reference', options);
  }

  let retryCount = 0;

  let failedScenarioLabels = await runTest();
  while (failedScenarioLabels.length > 0) {
    await runReference(failedScenarioLabels);
    failedScenarioLabels = await runTest(failedScenarioLabels);
    retryCount++;
    if (retryCount > 3) {
      console.error('FAILED SCENARIOS:', failedScenarioLabels);
      process.exit(1);
    }
  }
}

main();
