import { Config, Options } from './parse-argv';
import importCwd from 'import-cwd';

export const DEFAULT_CONFIG_PATH = './backstop.json';

export type NormalizedConfig = Omit<Config, 'paths' | 'report'> & {
  paths: Required<NonNullable<Config['paths']>>;
  report: Required<NonNullable<Config['report']>>;
};

export function assertConfig(config: Config): asserts config is NormalizedConfig {
  if (config.id === undefined) throw new Error('config.id is required');
  if (config.paths === undefined) throw new Error('config.paths is required');
  if (config.paths.bitmaps_reference === undefined) throw new Error('config.paths.bitmaps_reference is required');
  if (config.paths.bitmaps_test === undefined) throw new Error('config.paths.bitmaps_test is required');
  if (config.paths.html_report === undefined) throw new Error('config.paths.html_report is required');
  if (config.paths.json_report === undefined) throw new Error('config.paths.json_report is required');
  if (config.report === undefined) throw new Error('config.report is required');
  if (!config.report.includes('browser')) throw new Error('config.report must include "browser"');
  if (!config.report.includes('json')) throw new Error('config.report must include "json"');
}

export function readConfig(configObjOrPath: Options['config']): NormalizedConfig {
  console.log(process.cwd());
  const config: Config =
    typeof configObjOrPath === 'object'
      ? configObjOrPath
      : (importCwd('./' + configObjOrPath ?? DEFAULT_CONFIG_PATH) as Config);
  assertConfig(config);
  return config;
}
