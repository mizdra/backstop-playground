import { Core } from './core';
import { parseArgv } from './parse-argv';

export type RunnerOptions = {
  argv: string[];
};

export async function run({ argv }: RunnerOptions) {
  const options = await parseArgv(argv);

  // - `--docker` と `--config xxx.json` オプションが同時に渡される
  // - `dockerCommandTemplate` に `{args}` が含まれる
  //
  // 以上の 2 つの条件を満たす時、以下のようなコマンドで backstop が実行される
  // ```
  // docker run --rm -it --mount type=bind,source="/Users/mizdra/src/github.com/mizdra/backstopjs-playground/demo",target=/src \
  //   backstopjs/backstopjs:6.0.4 reference "--config=backstop.json" "--moby=true" "--config=xxx.json"
  // ```
  //
  // 見ての通り、`--config` オプションが複数渡されてしまっている (前者だけあればよいはず)。これにより、backstop が期待通り動作しない。
  // そこでここでは process.argv から `--config=xxx.json` を削除し、余計なオプションがつかないようにしている。
  if (options.docker && process.argv.includes('--config')) {
    process.argv.splice(process.argv.indexOf('--config'), 2);
  }

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
