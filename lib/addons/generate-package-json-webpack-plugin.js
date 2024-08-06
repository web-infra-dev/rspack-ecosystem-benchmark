import { Addon } from "./common.js";

export default class extends Addon {
	options = {
		times: 10
	};
	async afterSetup(ctx) {
		ctx.config =
			ctx.config +
			`
module.exports.plugins = module.exports.plugins || [];

const GeneratePackageJsonPlugin = require("generate-package-json-webpack-plugin");
const basePackage = {
	"name": "my-nodejs-module",
	"version": "1.0.0",
	"main": "./index.js",
	"engines": {
	  	"node": ">= 14"
	}
};
module.exports.plugins.push(new GeneratePackageJsonPlugin(basePackage));
`;
	}
}
