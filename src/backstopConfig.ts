import { Config, Scenario } from 'backstopjs';

function createScenario(path: string): Scenario {
  return {
    label: path,
    url: `http://localhost:8080${path}`,
    delay: 500,
    misMatchThreshold: 0.001,
  };
}

export const config: Config = {
  id: 'foo',
  scenarios: [createScenario('/page-1.html'), createScenario('/page-2.html'), createScenario('/page-3.html')],
  viewports: [
    {
      name: 'desktop',
      width: 1200,
      height: 800,
    },
  ],
  paths: {
    bitmaps_reference: 'backstop_data/bitmaps_reference',
    bitmaps_test: 'backstop_data/bitmaps_test',
    html_report: 'backstop_data/html_report',
    json_report: 'backstop_data/json_report',
  },
  engine: 'puppeteer',
  engineOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--disable-gpu'],
  },
  report: ['browser', 'json'],
};
