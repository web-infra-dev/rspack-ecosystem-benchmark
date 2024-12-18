import { bench, describe } from "vitest";
import { rspack } from "@rspack/core";
import rspackConfig from './cases/10000/rspack.config';

describe("10000 modules project", () => {
	bench("build with development mode", () => new Promise((resolve, reject) => {
		rspack({
			...rspackConfig,
			mode: "development"
		}, (err, stats) => {
			if (err) {
				reject(err);
			}
			if (stats?.hasErrors()) {
				reject(new Error(stats.toString({})));
			}
			resolve();
		});
	}));
});
