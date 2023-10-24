import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.config =
			ctx.config +
			`
			const ReactRefreshPlugin = require("@rspack/plugin-react-refresh");
			const prod = process.env.NODE_ENV === "production";
			module.exports.experiments ||= {};
			module.exports.experiments.rspackFuture ||= {};
			module.exports.experiments.rspackFuture.disableTransformByDefault = true;
			(module.exports.plugins ||= []).push(new ReactRefreshPlugin());
			module.exports.module ||= {};
			(module.exports.module.rules ||= []).push({
				test: /\.(j|t)s$/,
				exclude: [/[\\/]node_modules[\\/]/],
				loader: "builtin:swc-loader",
				options: {
					sourceMap: true,
					jsc: {
						parser: {
							syntax: "typescript"
						},
						externalHelpers: true
					},
					env: {
						targets: "Chrome >= 48"
					}
				}
			},
			{
				test: /\.(j|t)sx$/,
				loader: "builtin:swc-loader",
				exclude: [/[\\/]node_modules[\\/]/],
				options: {
					sourceMap: true,
					jsc: {
						parser: {
							syntax: "typescript",
							tsx: true
						},
						transform: {
							react: {
								runtime: "automatic",
								development: !prod,
								refresh: !prod
							}
						},
						externalHelpers: true
					},
					env: {
						targets: "Chrome >= 48"
					}
				}
			});
`;
	}
}
