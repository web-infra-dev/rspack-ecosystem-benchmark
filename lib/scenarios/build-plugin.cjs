const WARMUP_BUILDS = 10;
const TOTAL_BUILDS = 20;

module.exports = class BuildPlugin {
	apply(compiler) {
		let counter = 0;
		let isWatching = false;
		compiler.hooks.watchRun.tap("BuildPlugin", () => {
			isWatching = true;
		});
		(compiler.hooks.afterDone || compiler.hooks.done).tap("BuildPlugin", () => {
			setTimeout(() => {
				if (counter === WARMUP_BUILDS) console.log("#!# start");
				if (isWatching && counter <= TOTAL_BUILDS) console.log("#!# next");
			}, 10);
		});
		compiler.hooks.done.tap("BuildPlugin", (stats) => {
			if (isWatching) {
				counter++;
				if (counter <= WARMUP_BUILDS) return;
				if (counter > TOTAL_BUILDS) {
					if (compiler.watching) {
						compiler.watching.close();
					} else {
						process.nextTick(() => process.exit(0));
					}
				}
			}
			const { logging, time } = stats.toJson({
				all: false,
				timings: true,
			});
			console.log(`#!# stats = ${time}`);
			const memoryUsage = process.memoryUsage();
			console.log(`#!# heap memory = ${memoryUsage.heapUsed}`);
			console.log(`#!# rss memory = ${memoryUsage.rss}`);
			console.log(`#!# external memory = ${memoryUsage.external}`);
			console.log(`#!# array buffers memory = ${memoryUsage.arrayBuffers}`);
		});
		const old = compiler.infrastructureLogger;
		compiler.infrastructureLogger = (_name, type, args) => {
			old(_name, type, args);
			const name = _name.replace(/^webpack\./, "");
			if (type !== "time") return;
			const ms = args[1] * 1000 + args[2] / 1000000;
			console.log(
				`#!# ${name}.${args[0].replace(
					/restore cache content \d.+$/,
					"restore cache content"
				)} = ${ms}`
			);
		};
	}
};
