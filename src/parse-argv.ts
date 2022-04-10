import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yargs from 'yargs/yargs';
import { Config as BackstopJSOptions } from 'backstopjs';

export type Config = BackstopJSOptions;

export type Options = {
  config?: Config | string | undefined;
  filter?: string | undefined;
  docker?: boolean;
};

const PACKAGE_JSON = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

/** Parse argv into the config object */
export async function parseArgv(argv: string[]): Promise<Options> {
  const parsedArgv = await yargs(argv.slice(2))
    .version(PACKAGE_JSON.version)
    .usage('[options]')
    .option('config', {
      type: 'string',
      describe: 'Path to config file name',
      default: 'backstop.json',
    })
    .option('filter', {
      type: 'string',
      describe:
        'A RegEx string used to filter by scenario labels when running "test", "reference", or "approve" commands',
    })
    .option('docker', {
      type: 'boolean',
      describe: 'Render your test in a Docker container',
      default: false,
    }).argv;
  return {
    config: parsedArgv.config,
    filter: parsedArgv.filter,
    docker: parsedArgv.docker,
  };
}
