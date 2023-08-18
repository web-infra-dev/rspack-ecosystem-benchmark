# Rspack Benchmark

This repository is used to monitor rspack performance.

## Usage

You can use the scripts in the `bin` directory to prepare and run benchmark.

* `node bin/build-rspack.js [remote] [branch]`

Clone and build [rspack](https://github.com/web-infra-dev/rspack) in `.rspack` folder. You can set target branch with the parameter. eg.

``` bash
node bin/build-rspack.js # use the main branch to build
node bin/build-rspack.js origin main # use the main branch to build
node bin/build-rspack.js origin pull/1000/head # use the pull request with index 1000 to build
```

* `node bin/bench.js [benchmarkNames...]`

Run benchmark with rspack and write the output to `output` folder. You can configure the environment variable of `RSPACK_CLI_BIN` to set the rspack command path, and it will use the rspack from the `.rspack` folder by default. eg.

``` bash
node bin/bench.js # run all benchmarks
node bin/bench.js 10000_development-mode 10000_production-mode # run benchmarks named 10000_development-mode and 10000_production-mode
RSPACK_CLI_BIN=<your-rspack-cli> node bin/bench.js 10000_development-mode_hmr # set the rspack command path, and run 10000_development-mode_hmr
```

* `node bin/compare-bench.js <baseDate> <currentDate>`

Compare and print the difference between `<baseDate>` and `<currentDate>`. The parameter have three types, `current` will use the data from `output` folder. `latest` will use the latest data from `data` branch. A date string like `YYYY-MM-DD` will use the data of that day from `data` branch. eg.

``` bash
node bin/compare-bench.js current latest # use output data as base, and latest data as current
node bin/compare-bench.js latest 2023-08-17 # use latest data as base, and the data of 2023-08-17 as current
```

* `node bin/upload.js`

Clone the data branch to `.data` folder, copy `output` folder into it and push it to the remote.

## Glossary

#### Benchmark Name

Benchmark name is a string containing the case name and the addon names. A benchmark name is separated by "_", the first part is the case name, amd the other parts are the addon names.

#### Case

The benchmark case is the rspack project in `cases` folder. It must contain `rspack.config.js` and `hmr.js`, the first one is the default config for rspack, the next one is used to tell benchmark how to change file when hmr.

* `10000` is a project with 10000 modules
* `threejs` is a copy of three js

#### Addon

The addon is used to change rspack configuration and benchmark parameters. All addons are registered in `lib/addons`.

* `development-mode` is used to set the development mode
* `production-mode` is used to set the production mode
* `10x` is used to make the project module 10 times larger
* `hmr` is used to change the phase of collected metrics to hmr instead of build

#### Metric

The metrics collected through benchmarking includes `stats`, `exec`, `dist size`, etc.

#### Tag

The tag is `benchmarkName` + `metric`, it is used to display information on website and comparison results.

## How benchmark works

Rspack benchmark consists of the following steps.

``` mermaid
flowchart LR
    A("Setup") --> B("Generate")
    B --> C("Warmup")
    C --> D("Run")
    D --> E("Statistic")
    E --> F("Teardown")
```

* `Setup` is used to prepare the benchmark case environment and global context.
* `Generate` will generate the benchmark case.
* `Warmup` will attempt to run the benchmark case.
* `Run` will run the benchmark case multiple times and collect metric data.
* `Statistic` will calculate the final result through multiple benchmarks.
* `Teardown` is used to clean up.

The main process is controlled by `scenario`, and its structure is:

``` typescript
interface Context {
    caseDir: string
    originalFiles: Record<string, string>
    // final rspack.config.js string
    config: string
    // hmr config
    hmrConfig: Array<{
        rebuildChangeFile: string
        generateContent(originalContent, runTimes): string
    }>
    rspackArgs: string[]
    // how many times should run
    runTimes: number
    // timeout milliseconds
    timeout: number
    runData: Array<{
        stats: number
        exec: number
        ...
    }>
    result: Record<"stats" | "heap memory" | "rss memory"
     | "external memory" | "array buffers memory" | "exec"
     | "dist size", {
        min: number,
        max: number,
        mean: number,
        median: number,
        variance: number,
        stdDev: number,
        confidence: number,
        low: number,
        high: number,
        count: number,
        base: number
     }>
}

interface Scenario {
    async setup(): Context
    async generate(ctx: Context): void
    async warmup(ctx: Context): void
    async run(ctx: Context): void
    async statistic(ctx: Context): void
    async teardown(ctx: Context): void
}
```

The addons can change context in most steps, and its structure is:

``` typescript
interface Addon {
    async beforeSetup(): void
    async afterSetup(ctx: Context): void
    
    async beforeGenerate(ctx: Context): void
    async afterGenerate(ctx: Context): void
    
    async beforeStatistic(ctx: Context): void
    async afterStatistic(ctx: Context): void
    
    async beforeTeardown(ctx: Context): void
    async afterTeardown(ctx: Context): void
}
```

## How to add a benchmark case

1. move your project into the `cases` folder
2. move the project dependencies to global package.json
3. add `rspack.config.js` to make the project runnable by rspack
4. add `hmr.js` to make the project support hmr changes
5. try run `node bin/bench.js <your case>_<your addons>` to test
