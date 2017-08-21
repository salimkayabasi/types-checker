import reduce from 'async/reduce';
import { exec } from 'child_process';
import _ from 'lodash';
import ora from 'ora';

const typesPrefix = '@types/';

export default class TypesChecker {
  static async check(options) {
    const { cwd, logger } = options;
    let pkg;
    try {
      pkg = await import(`${cwd}/package.json`);
    } catch (e) {
      logger.error(e.message);
      process.exit(1);
    }
    const dependencies = _.get(pkg, 'dependencies', {});
    dependencies.node = 'node';
    const devDependencies = _.get(pkg, 'devDependencies', {});
    logger.debug('dependencies', dependencies);
    logger.debug('devDependencies', devDependencies);
    const modules = _.chain(dependencies)
      .map((value, key) => `${typesPrefix}${key}`)
      .difference(_.keys(devDependencies))
      .value();
    return TypesChecker.checkNpm(modules);
  }

  static async checkNpm(modules) {
    const spinner = ora('Looking for NPM modules').start();
    return new Promise((resolve, reject) => {
      reduce(modules, {},
        (response, moduleName, cb) =>
          exec(`npm view ${moduleName} version`,
            (err, result) => {
              if (!err) {
                response[moduleName] = result.trim();
              }
              cb(null, response);
            }),
        (err, result) => {
          spinner.stop();
          if (err) {
            reject(err);
          } else {
            resolve(_.keys(result));
          }
        },
      );
    });
  }

  static async interactive(options, state) {
    return {
      options,
      state,
    };
  }

  static async update(options, packageNames) {
    const { logger, cwd, useNpm, chalk } = options;
    const modules = packageNames.join(' ');
    if (_.isEmpty(modules)) {
      return Promise.resolve();
    }
    const cmd = `${useNpm ? 'npm install --save-dev' : 'yarn add --dev'} ${modules}`;
    logger.info('Running', `${chalk.cyanBright(cmd)}`);
    const spinner = ora('Installing dependencies').start();
    return new Promise((done, fail) => {
      exec(cmd, { cwd }, (err, stdout, stderr) => {
        spinner.stop();
        logger.debug(`\n${chalk.green(stdout)}\n${chalk.redBright(stderr)}`);
        if (err) {
          fail(err);
        } else {
          done();
        }
      });
    });
  }
}
