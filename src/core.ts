import backstop, { JSONReport } from 'backstopjs';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { uniqueBy } from './array';
import { Options, Config as ConfigType } from './parse-argv';

export const DEFAULT_CONFIG_PATH = 'backstop.json';

type NormalizedOptions = {
  config: NormalizedConfig;
  filter?: string | undefined;
  docker?: boolean;
};

type NormalizedConfig = Omit<ConfigType, 'paths' | 'report'> & {
  paths: Required<NonNullable<ConfigType['paths']>>;
  report: Required<NonNullable<ConfigType['report']>>;
};

function assertConfig(config: ConfigType): asserts config is NormalizedConfig {
  if (config.id === undefined) throw new Error('config.id is required');
  if (config.paths === undefined) throw new Error('config.paths is required');
  if (config.paths.bitmaps_reference === undefined) throw new Error('config.paths.bitmaps_reference is required');
  if (config.paths.bitmaps_test === undefined) throw new Error('config.paths.bitmaps_test is required');
  if (config.paths.html_report === undefined) throw new Error('config.paths.html_report is required');
  if (config.paths.json_report === undefined) throw new Error('config.paths.json_report is required');
  if (config.report === undefined) throw new Error('config.report is required');
  if (!config.report.includes('browser')) throw new Error('config.report must include "browser"');
  if (!config.report.includes('CI')) throw new Error('config.report must include "CI"');
}

export class Core {
  options: NormalizedOptions;
  reports: JSONReport[];
  constructor(options: Options) {
    const config: ConfigType =
      typeof options.config === 'object' ? options.config : require(options.config ?? DEFAULT_CONFIG_PATH);
    assertConfig(config);
    this.options = {
      config,
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
    await backstop('test', {
      ...this.options,
      config: {
        ...this.options.config,
        scenarios: this.options.config.scenarios.filter((scenario) => targetScenarioLabels.includes(scenario.label)),
      },
    }).catch((error) => {
      if (error instanceof Error && error.message.startsWith('Mismatch errors found.')) {
        // noop
      } else {
        throw error;
      }
    });
    const report = await this.readJSONReport();
    this.reports.push(report);
    return report.tests.filter((test) => test.status === 'fail').map((test) => test.pair.label);
  }
  async runReference(targetScenarioLabels: string[]): Promise<void> {
    await backstop('reference', {
      ...this.options,
      config: {
        ...this.options.config,
        scenarios: this.options.config.scenarios.filter((scenario) => targetScenarioLabels.includes(scenario.label)),
      },
    });
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

    // Move the reference image to html_report directory.
    // This way, the html_report directory becomes standalone.
    for (const test of tests) {
      const fromReference = join(test.pair.reference);
      const toReference = join(this.options.config.paths.html_report, 'bitmaps_reference', basename(fromReference));
      const fromTest = join(test.pair.test);
      const toTest = join(this.options.config.paths.html_report, 'bitmaps_test', basename(fromTest));
      await copyFile(fromReference, toReference);
      await copyFile(fromTest, toTest);
      test.pair.reference = toReference;
      test.pair.test = toTest;
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
    const jsonReport = await readFile(this.options.config.paths.json_report, 'utf8');
    return JSON.parse(jsonReport);
  }
}
