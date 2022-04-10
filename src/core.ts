import backstop, { JSONReport } from 'backstopjs';
import { copyFile, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { uniqueBy } from './array';
import { NormalizedConfig, readConfig, TEMP_CONFIG_PATH, writeTempConfig } from './config';
import { Options } from './parse-argv';

type NormalizedOptions = {
  config: NormalizedConfig;
  filter?: string | undefined;
  docker?: boolean;
};

export class Core {
  options: NormalizedOptions;
  reports: JSONReport[];
  constructor(options: Options) {
    this.options = {
      config: readConfig(options.config),
      filter: options.filter,
      docker: options.docker,
    };
    this.reports = [];
  }
  getAllScenarioLabels(): string[] {
    const scenarios = this.options.config.scenarios;
    return scenarios.map((scenario) => scenario.label);
  }
  async runTest(targetScenarioLabels: string[]): Promise<string[]> {
    // `docker` オプションが真で、`config` オプションにオブジェクトが渡されたときに、うまく動かない問題がある。
    // ref: https://github.com/garris/BackstopJS/issues/849
    // そこでここでは、config を一時的にファイルに書き出している。
    await writeTempConfig({
      ...this.options.config,
      scenarios: this.options.config.scenarios.filter((scenario) => targetScenarioLabels.includes(scenario.label)),
    });
    await backstop('test', {
      ...this.options,
      config: TEMP_CONFIG_PATH,
    }).catch((error) => {
      // TODO: ハンドリングする
    });
    await rm(TEMP_CONFIG_PATH);

    const report = await this.readJSONReport();
    this.reports.push(report);
    return report.tests.filter((test) => test.status === 'fail').map((test) => test.pair.label);
  }
  async runReference(targetScenarioLabels: string[]): Promise<void> {
    // `docker` オプションが真で、`config` オプションにオブジェクトが渡されたときに、うまく動かない問題がある。
    // ref: https://github.com/garris/BackstopJS/issues/849
    // そこでここでは、config を一時的にファイルに書き出している。
    await writeTempConfig({
      ...this.options.config,
      scenarios: this.options.config.scenarios.filter((scenario) => targetScenarioLabels.includes(scenario.label)),
    });
    await backstop('reference', {
      ...this.options,
      config: TEMP_CONFIG_PATH,
    });
    await rm(TEMP_CONFIG_PATH);
  }
  async createBrowserReport(targetScenarioLabels: string[]): Promise<void> {
    // Collect scenario results from all reports.
    const tests = uniqueBy(
      // NOTE: Reverse `reports` to give preference to the last result.
      this.reports
        .reverse()
        .map((report) => report.tests)
        .flat()
        .filter((test) => targetScenarioLabels.includes(test.pair.label)),
      (test) => test.pair.label,
    );

    const { bitmaps_reference, bitmaps_test, html_report, json_report } = this.options.config.paths;

    const toReferenceDir = join(html_report, 'bitmaps_reference');
    const toTestDir = join(html_report, 'bitmaps_test');

    // 前回の backstop 実行時の残骸が紛れ込まないよう、念の為一度作り直す
    await rm(toReferenceDir, { recursive: true, force: true });
    await rm(toTestDir, { recursive: true, force: true });

    // Move the reference image to html_report directory.
    // This way, the html_report directory becomes standalone.
    for (const test of tests) {
      const fromReference = join(json_report, test.pair.reference);
      const toReference = join(toReferenceDir, relative(bitmaps_reference, fromReference));
      const fromTest = join(json_report, test.pair.test);
      const toTest = join(toTestDir, relative(bitmaps_test, fromReference));

      await mkdir(toReferenceDir, { recursive: true });
      await mkdir(toTestDir, { recursive: true });

      // コピーしてくる
      await copyFile(fromReference, toReference);
      await copyFile(fromTest, toTest);
      test.pair.reference = relative(html_report, toReference);
      test.pair.test = relative(html_report, toTest);

      if (test.pair.diffImage) {
        const fromDiffImage = join(json_report, test.pair.diffImage);
        const toDiffImage = join(toTestDir, relative(bitmaps_test, fromDiffImage));
        await mkdir(dirname(toDiffImage), { recursive: true });
        await copyFile(fromDiffImage, toDiffImage);
        test.pair.diffImage = relative(html_report, toDiffImage);
      }
    }

    // Create `config.js` of browser report
    const configFilePath = join(this.options.config.paths.html_report, 'config.js');
    const newEcoReport = {
      testSuite: 'BackstopJS',
      id: this.options.config.id,
      tests,
    };
    await writeFile(configFilePath, `report(${JSON.stringify(newEcoReport, null, 2)});`);
  }

  private async readJSONReport(): Promise<JSONReport> {
    const jsonReport = await readFile(join(this.options.config.paths.json_report, 'jsonReport.json'), 'utf8');
    return JSON.parse(jsonReport);
  }
}
