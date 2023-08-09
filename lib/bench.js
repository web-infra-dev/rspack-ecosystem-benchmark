import { getScenario } from "./scenarios/index.js";
import { useAddons } from "./utils.js";

export async function run(benchmarkName) {
	const [caseName, ...addonNames] = benchmarkName.split("_");
	const scenario = getScenario(caseName);
	const addons = await Promise.all(
		addonNames.map(async name => {
			const Addon = await import(`./addons/${name}.js`);
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
