#!/usr/bin/env -S ts-node

import { Core } from './core';
import { parseArgv } from './parse-argv';

export type RunnerOptions = {
  argv: string[];
};

export async function run({ argv }: RunnerOptions) {
  const options = await parseArgv(argv);
  const core = new Core(options);
  const allScenarioLabels = core.getAllScenarioLabels();

  const failedScenarioLabels = await core.runTest(allScenarioLabels);

  if (failedScenarioLabels.length > 0) {
    await core.runReference(failedScenarioLabels);
    await core.runTest(failedScenarioLabels);
  }
  await core.createBrowserReport(failedScenarioLabels);
}
