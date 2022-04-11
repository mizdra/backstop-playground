import backstop, { JSONReport } from 'backstopjs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { uniqueBy } from './array';
import { NormalizedConfig, readConfig } from './config';
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
    await backstop('test', {
      ...this.options,
      config: {
        ...this.options.config,
        scenarios: this.options.config.scenarios.filter((scenario) => targetScenarioLabels.includes(scenario.label)),
      },
    }).catch((error) => {
      // TODO: ハンドリングする
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
