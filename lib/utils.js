import { spawn } from "child_process";
import { stat } from "fs/promises";
import puppeteer from "puppeteer";

export async function useAddons(addons, stage, ...args) {
	for (const item of addons) {
		await item[stage](...args);
	}
}

export async function runCommand(command, args, { verbose = true, env, onData } = {}) {
	const hasOnData = typeof onData === "function";
	const stdio = verbose ? "inherit" : "ignore";
	const p = spawn(command, args, {
		shell: true,
		stdio: [stdio, hasOnData ? "pipe" : stdio, "inherit"],
		stderr: "inherit",
		env: env
			? {
					...process.env,
					...env,
			  }
			: undefined,
	});
	if (hasOnData) {
		p.stdout.on("data", onData);
	}

	const exitCode = await new Promise(resolve => p.once("exit", resolve));
	if (exitCode !== 0) throw new Error(`${command} ${args.join(" ")} failed with ${exitCode}`);
}

export function getType(metric) {
	if (metric.endsWith(" memory")) return "memory";
	if (metric.endsWith(" size")) return "size";
	if (metric.endsWith(" cache")) return "ratio";
	return "time";
}

export async function dirExist(p) {
	try {
		if ((await stat(p)).isDirectory()) return true;
	} catch {
		return false;
	}
}

export function formatDate(timestamp) {
	const time = new Date(timestamp);
	const year = time.getFullYear();
	const month = time.getMonth() + 1;
	const day = time.getDate();
	return `${year}-${month < 10 ? "0" + month : month}-${day < 10 ? "0" + day : day}`;
}

export async function openPage(url) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(url, {
		waitUntil: "networkidle2",
	});
	await browser.close();
}

export const isGitHubActions = !!process.env.GITHUB_ACTIONS;

export const ratio = value => {
	return `${Number(value).toFixed(2)}%`;
};

export const bytes = value => {
	if (value === 0) return `-`;
	if (value > 1024 * 102400) return `${Math.round(value / 1024 / 1024)} MiB`;
	if (value > 1024 * 10240) return `${Math.round(value / 1024 / 102.4) / 10} MiB`;
	if (value > 1024 * 1024) return `${Math.round(value / 1024 / 10.24) / 100} MiB`;
	if (value > 102400) return `${Math.round(value / 1024)} KiB`;
	if (value > 10240) return `${Math.round(value / 102.4) / 10} KiB`;
	if (value > 1024) return `${Math.round(value / 10.24) / 100} KiB`;
	return `${Math.round(value)} bytes`;
};

export const ms = value => {
	if (value === 0) return `0 ms`;
	if (value > 100000) return `${Math.round(value / 1000)} s`;
	if (value > 10000) return `${Math.round(value / 100) / 10} s`;
	if (value > 1000) return `${Math.round(value / 10) / 100} s`;
	if (value > 10) return `${Math.round(value)} ms`;
	if (value > 1) return `${Math.round(value * 10) / 10} ms`;
	if (value > 0.1) return `${Math.round(value * 100) / 100} ms`;
	if (value > 0.01) return `${Math.round(value * 1000)} µs`;
	return `${Math.round(value * 10000) / 10} µs`;
};
