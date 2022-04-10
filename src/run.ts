import { Core } from './core';
import { parseArgv } from './parse-argv';

export type RunnerOptions = {
  argv: string[];
};

export async function run({ argv }: RunnerOptions) {
  const options = await parseArgv(argv);
  const core = new Core(options);
  const allScenarioLabels = core.getAllScenarioLabels();

  const failedScenarioLabels1 = await core.runTest(allScenarioLabels);

  let failedScenarioLabels2: string[] = [];
  if (failedScenarioLabels1.length > 0) {
    await core.runReference(failedScenarioLabels1);
    failedScenarioLabels2 = await core.runTest(failedScenarioLabels1);
  }

  await core.createBrowserReport([...failedScenarioLabels1, ...failedScenarioLabels2]);

  if (failedScenarioLabels2.length > 0) {
    console.error(`Failed Scenarios: ${failedScenarioLabels2.join(', ')}`);
    process.exit(1);
  }
}
