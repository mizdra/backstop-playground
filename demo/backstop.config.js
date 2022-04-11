// @ts-check

const { readdirSync } = require('fs');
const { join, basename } = require('path');

/**
 * @param {string} path
 * @returns {import('backstopjs').Scenario}
 */
function createScenario(path) {
  return {
    label: path,
    url: `http://localhost:8080${path}`,
    delay: 500,
    misMatchThreshold: 0.001,
  };
}

/**
 * @returns {import('backstopjs').Scenario[]}
 */
function createScenarios() {
  const publicDir = join(__dirname, './public');
  return readdirSync(publicDir).map((file) => {
    const path = '/' + basename(file);
    return createScenario(path);
  });
}

/** @type {import('backstopjs').Config} */
const config = {
  id: 'foo',
  scenarios: createScenarios(),
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
  // dockerCommandTemplate:
  //   'docker run --rm -it --mount type=bind,source="{cwd}",target=/src --mount type=bind,source="{cwd}/../node_modules",target=/usr/local/lib/node_modules backstopjs/backstopjs:{version} {backstopCommand}',
  dockerCommandTemplate:
    'docker run --rm -it --mount type=bind,source="{cwd}",target=/src --mount type=bind,source="{cwd}/../node_modules",target=/usr/local/lib/node_modules backstopjs/backstopjs:{version} {backstopCommand}  {args}',
};

module.exports = config;
