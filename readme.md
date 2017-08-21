# types-checker

You may forget to add `type definition`s for your projects. It's hard to add all dependencies at 
the same time. You need to be sure that how many modules have definition module like `@types/...`.

`types-checker` will do it for you

```bash
cd path/of/your/project
types-checker # aliases ts-checker OR tscheck
```

### Installing
```bash
yarn add global types-checker
```
or
```bash
npm i -g types-checker
```

### options
```bash
types-checker --help

Usage: types-checker [options]

Options:

  -V, --version      output the version number
  -l, --log          Debug output. See all logs
  -a, --all          Add all possible type definitions
  -i, --interactive  Interactive mode
  -N, --use-npm      Use NPM instead of Yarn
  -h, --help         output usage information

```



