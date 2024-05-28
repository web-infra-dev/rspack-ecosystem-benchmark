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
		compiler.hooks.done.tap("BuildPlugin", stats => {
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
				logging: "verbose"
			});
			console.log(`#!# stats = ${time}`);
			const memoryUsage = process.memoryUsage();
			console.log(`#!# heap memory = ${memoryUsage.heapUsed}`);
			console.log(`#!# rss memory = ${memoryUsage.rss}`);
			console.log(`#!# external memory = ${memoryUsage.external}`);
			console.log(`#!# array buffers memory = ${memoryUsage.arrayBuffers}`);
			for (const _name of Object.keys(logging)) {
				const { entries } = logging[_name];
				const name = _name.replace(/^rspack\./, "");
				for (const { type, args, message } of entries) {
					if (type === "time") {
						if (args) {
							const ms = args[1] * 1000 + args[2] / 1000000;
							console.log(`#!# ${name}.${args[0]} = ${ms}`);
						} else {
							const [, label, msStr] = /^(.+): ([\d.]+) ms$/.exec(message);
							console.log(`#!# ${name}.${label} = ${msStr}`);
						}
					} else if (type === "cache") {
						if (args) {
							const ratio = (args[1] / args[2]) * 100;
							console.log(`#!# ${name}.${args[0]} = ${ratio}`);
						} else {
							const [, label, ratio] =
								/^(.+): ([\d.]+)% \(([\d.\/]+)\/([\d.\/]+)\)$/.exec(message);
							console.log(`#!# ${name}.${label} = ${ratio}`);
						}
					}
				}
			}
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
