import path from "path";
import { fileURLToPath } from "url";
import { getScenario } from "./scenarios/index.js";
import { useAddons, dirExist } from "./utils.js";

const dirname = path.resolve(fileURLToPath(import.meta.url), "..");

export async function run(benchmarkName) {
	console.log("Running bench case:", benchmarkName);

	const [caseName, ...addonNames] = benchmarkName.split("_");
	const scenario = getScenario(caseName);
	const addons = await Promise.all(
		addonNames.map(async name => {
			const hasDir = await dirExist(path.resolve(dirname, `./addons/${name}/`));
			const Addon = hasDir
				? await import(`./addons/${name}/index.js`)
				: await import(`./addons/${name}.js`);
			return new Addon.default();
		})
	);

	await useAddons(addons, "beforeSetup");
	const ctx = await scenario.setup();
	await useAddons(addons, "afterSetup", ctx);

	try {
		await useAddons(addons, "beforeGenerate", ctx);
		await scenario.generate(ctx);
		await useAddons(addons, "afterGenerate", ctx);

		// warmup
		await scenario.warmup(ctx);

		// run
		await scenario.run(ctx);

		await useAddons(addons, "beforeStatistic", ctx);
		await scenario.statistic(ctx);
		await useAddons(addons, "afterStatistic", ctx);
	} finally {
		await useAddons(addons, "beforeTeardown", ctx);
		await scenario.teardown(ctx);
		await useAddons(addons, "afterTeardown", ctx);
	}

	return ctx.result;
}
