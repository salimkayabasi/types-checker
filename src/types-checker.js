import reduce from 'async/reduce';
import { exec } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import _ from 'lodash';
import ora from 'ora';
import blacklist from './blacklist';
import whitelist from './whitelist';

const typesPrefix = '@types/';

export default class TypesChecker {
  static async beforeChecking(options) {
    const devDependencies = await TypesChecker.askForDevDependencies(options);
    options.logger.debug('devDependencies', devDependencies);
    return {
      ...options,
      devDependencies,
    };
  }

  static async run(options) {
    const { logger, chalk } = options;
    let params = options;
    params = await TypesChecker.beforeChecking(params);
    const modules = await TypesChecker.check(params);
    params.modules = modules;
    TypesChecker.logMissingModules(params);
    params = await TypesChecker.afterChecking(params);
    if (_.isEmpty(params.modules)) {
      logger.info(chalk.green('There is no packages to install'));
      return Promise.resolve(params.modules);
    }
    if (params.install) {
      return TypesChecker.update(params);
    }
    const param = chalk.yellow('--install');
    logger.info(`Please run with '${param}' param if you want to install these dependencies`);
    return modules;
  }

  static async afterChecking(options) {
    const modules = await TypesChecker.askForModules(options) || [];
    const install = await TypesChecker.askForInstalling(options, modules);
    const useNpm = await TypesChecker.askForPackageManager(options, install);
    return {
      ...options,
      modules,
      useNpm,
      install,
    };
  }

  static logMissingModules(options) {
    const { logger, chalk } = options;
    if (!_.isEmpty(options.modules)) {
      logger.info('These modules are missing', _.map(options.modules,
        packageName => chalk.yellowBright(packageName),
      ).join(' '));
    }
  }

  static async askForDevDependencies(options) {
    const result = await inquirer.prompt(
      [
        {
          name: 'devDependencies',
          message: 'Would you like to check devDependencies also?',
          type: 'confirm',
          when() {
            return options.interactive && !options.devDependencies;
          },
          default() {
            return options.devDependencies;
          },
        },
      ]);
    const { devDependencies } = result;
    return devDependencies || options.devDependencies;
  }

  static async askForModules(options) {
    const result = await inquirer.prompt(
      [
        {
          name: 'modules',
          message: 'Choose which packages to install.',
          type: 'checkbox',
          when() {
            return options.interactive && !options.install;
          },
          default: options.modules,
          choices: options.modules,
          pageSize: process.stdout.rows - 2,
        },
      ]);
    const { modules } = result;
    return modules || options.modules;
  }

  static async askForInstalling(options, modules) {
    const result = await inquirer.prompt(
      [
        {
          name: 'install',
          message: 'Would you like to install selected dependencies?',
          type: 'confirm',
          when() {
            return options.interactive && !options.install && !_.isEmpty(modules);
          },
          default() {
            return options.install;
          },
        },
      ]);
    const { install } = result;
    return install || options.install;
  }

  static async askForPackageManager(options, install) {
    const defaultValue = options.useNpm ? 'npm' : 'yarn';
    const result = await inquirer.prompt(
      [
        {
          name: 'manager',
          message: 'Which package manager would you like to use?',
          type: 'list',
          choices: ['yarn', 'npm'],
          when() {
            return install && options.interactive && !options.useNpm;
          },
          default() {
            return defaultValue;
          },
          pageSize: process.stdout.rows - 2,
        },
      ]);
    const { manager } = result;
    return (manager || defaultValue) === 'npm';
  }

  static getTypedModuleNames(packages) {
    let items = packages;
    if (_.isArray(packages)) {
      items = _.compact(_.flatten(packages));
    }
    const ifArray = value => (_.startsWith(value, typesPrefix) ? value : `${typesPrefix}${value}`);
    const ifObject = (value, key) => ifArray(key);
    return _.uniq(_.map(items, _.isArray(items) ? ifArray : ifObject));
  }

  static async check(options) {
    const { cwd, logger, chalk } = options;
    const pkg = await new Promise(
      (done, fail) => {
        fs.readFile(`${cwd}/package.json`, {},
          (err, data) => {
            if (err) {
              fail(err);
            } else {
              try {
                const result = JSON.parse(data.toString());
                done(result);
              } catch (e) {
                fail(e);
              }
            }
          });
      })
      .catch((e) => {
        logger.error(chalk.red(`${e.message}\n${e.stack}`));
        process.exit(1);
      });
    const dependencies = _.get(pkg, 'dependencies', {});
    const devDependencies = _.get(pkg, 'devDependencies', {});
    const tscheck = _.get(pkg, 'tscheck', {});

    const all = [_.keys(dependencies), whitelist];
    if (options.devDependencies) {
      all.push(_.keys(devDependencies));
    }

    const exclude = [
      _.get(tscheck, 'exclude', []),
      blacklist,
    ];

    const allModules = TypesChecker.getTypedModuleNames(all);
    const excludedModules = TypesChecker.getTypedModuleNames(exclude);
    const modules = _.difference(allModules, excludedModules);

    logger.debug('allModules', allModules);
    logger.debug('excludedModules', excludedModules);
    logger.debug('modules', modules);
    return TypesChecker.checkNpm(options, modules);
  }

  static async checkNpm(options, modules) {
    const { logger } = options;
    const spinner = ora('Looking for NPM modules').start();
    return new Promise((resolve, reject) => {
      reduce(modules, {},
        (response, moduleName, cb) => {
          spinner.text = `Looking for ${moduleName}`;
          logger.debug(spinner.text);
          exec(`npm view ${moduleName} version`,
            (err, result) => {
              if (!err) {
                response[moduleName] = result.trim();
              }
              cb(null, response);
            });
        },
        (err, result) => {
          if (err) {
            spinner.fail('Got an error, please try again later');
            reject(err);
          } else {
            spinner.succeed('Checked all possible NPM modules');
            resolve(_.keys(result));
          }
        },
      );
    });
  }

  static async update(options) {
    const { logger, cwd, useNpm, chalk, modules } = options;
    if (_.isEmpty(modules)) {
      return Promise.resolve(modules);
    }
    const cmd = `${useNpm ? 'npm install --save-dev' : 'yarn add --dev'} ${modules.join(' ')}`;
    logger.info('Running', `${chalk.cyanBright(cmd)}`);
    const spinner = ora('Installing dependencies').start();
    return new Promise((done, fail) => {
      exec(cmd, { cwd }, (err, stdout, stderr) => {
        spinner.stop();
        logger.debug(`\n${chalk.green(stdout)}\n${chalk.redBright(stderr)}`);
        if (err) {
          spinner.fail('Failed on installing dependencies, please check the logs');
          fail(err);
        } else {
          spinner.succeed('Successfully installed');
          done();
        }
      });
    });
  }
}
