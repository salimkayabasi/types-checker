import chalk from 'chalk';
import program from 'commander';
import log4js from 'log4js';
import pkg from '../package.json';
import TypesChecker from './types-checker';

const logger = log4js.getLogger('types-checker');

program
  .version(pkg.version)
  .option('-l, --logger', 'Debug output. See all logs')
  .option('-c, --no-color', 'Disable colored output')
  .option('-a, --install', 'Install all possible type definitions')
  .option('-e, --error', 'Return the number of packages as exit code')
  .option('-p, --path [value]', 'Path for package.json file')
  .option('-i, --interactive', 'Interactive mode')
  .option('-N, --use-npm', 'Use NPM instead of Yarn')
  .option('-D, --dev-dependencies', 'Search for devDependencies')
  .parse(process.argv);

const options = {
  log: program.logger || false,
  noColor: program.noColor || false,
  install: program.install || false,
  error: program.error || false,
  interactive: program.interactive || false,
  useNpm: program.useNpm || false,
  cwd: program.path || process.cwd(),
  devDependencies: program.devDependencies || false,
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
TypesChecker.run(options)
  .then((packageNames) => {
    const finishedAt = process.hrtime(startedAt);
    const nanoseconds = (finishedAt[0] * 1e9) + finishedAt[1];
    const seconds = (nanoseconds / 1e9).toFixed(2);
    const count = (packageNames && packageNames.length) || 0;
    const msg = `Done in ${seconds}s`;
    if (options.error && count !== 0) {
      logger.error(chalk.red(`${msg} (${count} module(s))`));
      process.exit(count);
    } else {
      logger.info(chalk.green(msg));
      process.exit(0);
    }
  })
  .catch((e) => {
    logger.error('fatal_error', e);
    process.exit(1);
  });
