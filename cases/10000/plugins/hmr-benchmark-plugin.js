const fs = require("fs");
const path = require("path");
class HmrBenchmarkPlugin {
	constructor(options) {
		this.options = options;
		this.currentCaseIndex = 0;
		this.currentCase = this.options.cases[this.currentCaseIndex];
		this.durationsMap = { [this.currentCase.type]: {} };
		// the key of map is the rebuild id, value is the start time stamp
		this.startTimeStampMap = {};
		this.buildId = -1;
	}

	apply(compiler) {
		compiler.hooks.watchRun.tap("HmrBenchmarkPlugin", () => {
			this.buildId++;
			this.startTimeStampMap[this.buildId] = Date.now();
		});
		compiler.hooks.done.tap("HmrBenchmarkPlugin", (stats) => {
			if (this.buildId > 0 && this.startTimeStampMap[this.buildId]) {
				let now = Date.now();
				let duration = now - this.startTimeStampMap[this.buildId];
				this.durationsMap[this.currentCase.type][this.buildId] = duration;
			}
			if (Object.keys(this.durationsMap[this.currentCase.type]).length >= 5) {
				this.currentCaseIndex++;
				if (this.currentCaseIndex >= this.options.cases.length) {
					console.log(this.durationsMap);
					process.exit(process.exitCode || 0);
				}
				this.currentCase = this.options.cases[this.currentCaseIndex];
				this.durationsMap[this.currentCase.type] =  {};
			}
			updateSomething(this.currentCase);
		});
	}
}

module.exports = HmrBenchmarkPlugin;

function updateSomething(testCase) {
	let nextRenderedFile = testCase.generate();
	fs.writeFileSync(testCase.path, nextRenderedFile);
}

