import program from 'commander';
import _ from 'lodash';
import logWith from 'log-with';
import pkg from '../package.json';
import TypesChecker from './types-checker';

const logger = logWith(module);

program
  .version(pkg.version)
  .option('-l, --log', 'Debug output. See all logs')
  .option('-a, --all', 'Add all possible type definitions')
  .option('-p, --path [value]', 'Path for package.json file')
  .option('-i, --interactive', 'Interactive mode')
  .option('-N, --use-npm', 'Use NPM instead of Yarn')
  .parse(process.argv);

const options = {
  log: program.log || (process.env.NODE_DEBUG === 'true') || false,
  all: program.all || false,
  interactive: program.interactive || false,
  useNpm: program.useNpm || false,
  cwd: program.path || process.cwd(),
};

if (options.log) {
  logger.level = 'debug';
}

logger.debug('All options', options);

TypesChecker.check(options)
  .then(async (state) => {
    if (_.isEmpty(state)) {
      logger.info('We couldn\'t find any dependencies to install');
      return Promise.resolve();
    }
    let filtered = state;
    if (options.interactive) {
      filtered = await TypesChecker.interactive(options, filtered);
      logger.debug('filtered state', filtered);
    }
    return TypesChecker.update(options, filtered);
  })
  .then(() => {
    logger.info('Done');
    process.exit(0);
  })
  .catch((e) => {
    logger.error('fatal_error', e);
    process.exit(1);
  });
