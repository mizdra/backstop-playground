#!/usr/bin/env -S ts-node

import { Core } from './core';
import { Options } from './parse-argv';

export async function run(options: Options) {
  const core = new Core(options);
  const allScenarioLabels = core.getAllScenarioLabels();

  const failedScenarioLabels = await core.runTest(allScenarioLabels);

  if (failedScenarioLabels.length > 0) {
    await core.runReference(failedScenarioLabels);
    await core.runTest(failedScenarioLabels);
  }
  await core.createBrowserReport(failedScenarioLabels);
}
