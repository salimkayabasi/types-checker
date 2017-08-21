import reduce from 'async/reduce';
import { exec } from 'child_process';
import _ from 'lodash';
import logWith from 'log-with';

const logger = logWith(module);
const typesPrefix = '@types/';

export default class TypesChecker {
  static async check(options) {
    const { cwd, log } = options;
    if (log) {
      logger.level = 'debug';
    }
    let pkg;
    try {
      pkg = await import(`${cwd}/package.json`);
    } catch (e) {
      logger.error(e.message);
      process.exit(1);
    }
    const dependencies = _.get(pkg, 'dependencies', {});
    const devDependencies = _.get(pkg, 'devDependencies', {});
    logger.debug('dependencies', dependencies);
    logger.debug('devDependencies', devDependencies);
    const modules = _.chain(dependencies)
      .map((value, key) => `${typesPrefix}${key}`)
      .difference(_.keys(devDependencies))
      .value();
    logger.debug('possible modules', modules);
    return TypesChecker.checkNpm(modules);
  }

  static async checkNpm(modules) {
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
          if (err) {
            reject(err);
          } else {
            resolve(result);
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

  static async update(options, state) {
    const { log, cwd, useNpm } = options;
    const modules = _.keys(state).join(' ');
    if (log) {
      logger.level = 'debug';
    }
    if (_.isEmpty(modules)) {
      return Promise.resolve();
    }
    const cmd = `${useNpm ? 'npm install --save-dev' : 'yarn add --dev'} ${modules}`;
    logger.info('Running', `'${cmd}'`);
    return new Promise((done, fail) => {
      exec(cmd, { cwd }, (err, stdout, stderr) => {
        logger.debug(`\n${stdout}\n${stderr}`);
        if (err) {
          fail(err);
        } else {
          done();
        }
      });
    });
  }
}
