#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import meow from "meow";
import { generateDetailData } from "../lib/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");

const cli = meow({
	importMeta: import.meta,
	flags: {
		base: {
			type: "string",
			default: "latest"
		},
		current: {
			type: "string",
			default: "current"
		},
		output: {
			type: "string",
			default: "output/detail.html"
		}
	}
});

const { base, current, output } = cli.flags;

const configPath = join(process.cwd(), "bench.config.js");
const config = (await import(configPath)).default;
const benchmarkDirectory = config.benchmarkDirectory ?? join(process.cwd(), "output");

const detailData = await generateDetailData(base, current, benchmarkDirectory);

const distDir = join(rootDir, "detail-page", "dist");
let templateHtml;
let bundleJs;
try {
	templateHtml = await readFile(join(distDir, "index.html"), "utf-8");
	bundleJs = await readFile(join(distDir, "bundle.js"), "utf-8");
} catch {
	console.error(`Detail page build artifacts not found at ${distDir}`);
	console.error("Please build the detail-page first: cd detail-page && npm run build");
	process.exit(1);
}

// Inline the JS bundle into the HTML and inject benchmark data
const dataScript = `<script>window.__BENCHMARK_DATA__=${JSON.stringify(detailData)}</script>`;
const inlineScript = `<script>${bundleJs}</script>`;

// Replace the external script reference and data placeholder
let html = templateHtml
	.replace(/<script>window\.__BENCHMARK_DATA__="__BENCHMARK_DATA__"<\/script>/, dataScript)
	.replace(/<script src="bundle\.js"><\/script>/, inlineScript);

const outputPath = resolve(process.cwd(), output);
await mkdir(resolve(outputPath, ".."), { recursive: true });
await writeFile(outputPath, html);

console.log(`Detail page generated at ${outputPath}`);
