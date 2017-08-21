# types-checker

You may forget to add `type definition`s for your projects. It's hard to add all dependencies at 
the same time. You need to be sure that how many modules have definition module like `@types/...`.

`types-checker` will do it for you

```bash
cd path/of/your/project
types-checker # aliases ts-checker OR tscheck
```

[![asciicast](https://asciinema.org/a/ZyQ7R7YoLccHX2tpL5IdgsK81.png)](https://asciinema.org/a/ZyQ7R7YoLccHX2tpL5IdgsK81)

### Usage

Default params
```bash

tscheck
Starting types-checker@0.0.3
These modules are missing @types/config @types/node
Please run with '--all' param if you want to install these dependencies
Done in 1.66s

```

Using with Yarn
```bash

tscheck -a
Starting types-checker@0.0.3
These modules are missing @types/config @types/node
Running yarn add --dev @types/config @types/node
Done in 2.66s

```

Using with NPM
```bash

tscheck -a -N
Starting types-checker@0.0.3
These modules are missing @types/config @types/node
Running npm install --save-dev @types/config @types/node
Done in 2.00s

```


### Installing
```bash
yarn add global types-checker
```
or
```bash
npm i -g types-checker
```

### Options
```bash
types-checker --help

Usage: types-checker [options]

Options:

  -V, --version       output the version number
  -l, --logger        Debug output. See all logs
  -c, --no-color      Disable colored output
  -a, --all           Add all possible type definitions
  -p, --path [value]  Path for package.json file
  -i, --interactive   Interactive mode
  -N, --use-npm       Use NPM instead of Yarn
  -h, --help          output usage information

```



