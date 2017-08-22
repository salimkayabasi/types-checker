import chalk from 'chalk';
import program from 'commander';
import _ from 'lodash';
import log4js from 'log4js';
import pkg from '../package.json';
import TypesChecker from './types-checker';

const logger = log4js.getLogger('types-checker');

program
  .version(pkg.version)
  .option('-l, --logger', 'Debug output. See all logs')
  .option('-c, --no-color', 'Disable colored output')
  .option('-a, --all', 'Add all possible type definitions')
  .option('-p, --path [value]', 'Path for package.json file')
  .option('-i, --interactive', 'Interactive mode')
  .option('-N, --use-npm', 'Use NPM instead of Yarn')
  .parse(process.argv);

const options = {
  log: program.logger || false,
  noColor: program.noColor || false,
  all: program.all || false,
  interactive: program.interactive || false,
  useNpm: program.useNpm || false,
  cwd: program.path || process.cwd(),
};

chalk.enabled = !options.noColor;

log4js.configure({
  appenders: {
    out: {
      type: 'stdout',
      layout: {
        type: 'messagePassThrough',
      },
    },
  },
  categories: {
    default: {
      appenders: ['out'],
      level: options.log ? 'debug' : 'info',
    },
  },
});

logger.debug('All options', options);

options.logger = logger;
options.chalk = chalk;

logger.info(`${chalk.green('Starting')} ${pkg.name}@${pkg.version}`);
const startedAt = process.hrtime();
TypesChecker.check(options)
  .then(async (modules) => {
    if (_.isEmpty(modules)) {
      logger.info(chalk.red('We couldn\'t find any dependencies to install'));
      return Promise.resolve();
    }
    logger.info('These modules are missing', _.map(modules,
      packageName => chalk.yellowBright(packageName))
      .join(' '));
    if (options.interactive) {
      return TypesChecker.interactive(options, modules);
    } else if (options.all) {
      return TypesChecker.update(options, modules);
    }
    const param = chalk.yellow('--all');
    logger.info(`Please run with '${param}' param if you want to install these dependencies`);
    return Promise.resolve();
  })
  .then(() => {
    const finishedAt = process.hrtime(startedAt);
    const nanoseconds = (finishedAt[0] * 1e9) + finishedAt[1];
    const seconds = (nanoseconds / 1e9).toFixed(2);
    logger.info(chalk.green(`Done in ${seconds}s`));
    process.exit(0);
  })
  .catch((e) => {
    logger.error('fatal_error', e);
    process.exit(1);
  });
