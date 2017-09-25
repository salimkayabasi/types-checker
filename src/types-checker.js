import reduce from 'async/reduce';
import { exec } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import _ from 'lodash';
import ora from 'ora';

const typesPrefix = '@types/';

export default class TypesChecker {
  static getTypedModuleNames(packages) {
    const ifArray = value => (_.startsWith(typesPrefix) ? value : `${typesPrefix}${value}`);
    const ifString = (value, key) => ifArray(key);
    return _.map(packages, _.isArray(packages) ? ifArray : ifString);
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
    dependencies.node = 'node';
    const devDependencies = _.get(pkg, 'devDependencies', {});
    if (options.devDependencies) {
      _.extend(dependencies, devDependencies);
    }
    const tscheck = _.get(pkg, 'tscheck', {});
    logger.debug('dependencies', dependencies);
    logger.debug('devDependencies', devDependencies);
    logger.debug('tscheck', tscheck);
    const modules = _.difference(
      TypesChecker.getTypedModuleNames(dependencies),
      _.keys(devDependencies),
      TypesChecker.getTypedModuleNames(_.get(tscheck, 'exclude')),
    );
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

  static async interactive(options, packageNames) {
    const { logger, chalk } = options;
    const result = await inquirer.prompt(
      [
        {
          name: 'packages',
          message: 'Choose which packages to install.',
          type: 'checkbox',
          default: packageNames,
          choices: packageNames,
          pageSize: process.stdout.rows - 2,
        },
        {
          name: 'install',
          message: 'Would you like to install selected dependencies?',
          type: 'confirm',
          when(answers) {
            return answers.packages.length;
          },
          default(answers) {
            return answers.packages.length;
          },
        },
        {
          name: 'manager',
          message: 'Which package manager would you like to use?',
          type: 'list',
          choices: ['yarn', 'npm'],
          when(answers) {
            return answers.install;
          },
          pageSize: process.stdout.rows - 2,
        },
      ]);
    const { manager, packages, install } = result;
    logger.debug('interactive', result);
    if (_.isEmpty(packages)) {
      logger.info(chalk.red('You haven\'t selected any packages to install'));
      return Promise.resolve(packages);
    }
    const opts = options;
    opts.useNpm = manager === 'npm';
    opts.all = install;
    if (opts.all) {
      return TypesChecker.update(opts, packages);
    }
    return Promise.resolve(packageNames);
  }

  static async update(options, packageNames) {
    const { logger, cwd, useNpm, chalk } = options;
    const modules = packageNames.join(' ');
    if (_.isEmpty(modules)) {
      return Promise.resolve(packageNames);
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
          done(packageNames);
        }
      });
    });
  }
}
