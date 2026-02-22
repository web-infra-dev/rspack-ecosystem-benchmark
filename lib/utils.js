import { spawn } from "child_process";
import { stat } from "fs/promises";
import puppeteer from 'puppeteer'

export async function useAddons(addons, stage, ...args) {
	for (const item of addons) {
		await item[stage](...args);
	}
}

export async function runCommand(
	command,
	args,
	{
		verbose = true,
		env,
		onData,
		captureOutput = false,
		outputTailSize = 12000
	} = {}
) {
	const hasOnData = typeof onData === "function";
	const appendTail = (tail, chunk) => {
		const text = chunk.toString();
		const nextTail = tail + text;
		if (nextTail.length <= outputTailSize) {
			return nextTail;
		}
		return nextTail.slice(-outputTailSize);
	};

	let stdoutTail = "";
	let stderrTail = "";

	const stdin = verbose ? "inherit" : "ignore";
	const stdout = hasOnData || captureOutput ? "pipe" : verbose ? "inherit" : "ignore";
	const stderr = captureOutput ? "pipe" : "inherit";
	const p = spawn(command, args, {
		shell: true,
		stdio: [stdin, stdout, stderr],
		env: env
			? {
				...process.env,
				...env
			}
			: undefined
	});
	if (p.stdout) {
		p.stdout.on("data", chunk => {
			if (hasOnData) {
				onData(chunk);
			}
			if (captureOutput) {
				stdoutTail = appendTail(stdoutTail, chunk);
				if (verbose) {
					process.stdout.write(chunk);
				}
			}
		});
	}
	if (p.stderr) {
		p.stderr.on("data", chunk => {
			if (captureOutput) {
				stderrTail = appendTail(stderrTail, chunk);
				if (verbose) {
					process.stderr.write(chunk);
				}
			}
		});
	}

	const exitCode = await new Promise((resolve, reject) => {
		p.once("error", reject);
		p.once("exit", resolve);
	});
	if (exitCode !== 0) {
		const outputSections = [];
		if (stdoutTail.trim()) {
			outputSections.push(`stdout:\n${stdoutTail.trimEnd()}`);
		}
		if (stderrTail.trim()) {
			outputSections.push(`stderr:\n${stderrTail.trimEnd()}`);
		}
		const outputMessage = outputSections.length
			? `\nCommand output tail:\n${outputSections.join("\n\n")}`
			: "";
		throw new Error(
			`${command} ${args.join(" ")} failed with ${exitCode}.${outputMessage}`
		);
	}
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
	return `${year}-${month < 10 ? "0" + month : month}-${day < 10 ? "0" + day : day
		}`;
}

export async function openPage(url) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(url, {
		waitUntil: "networkidle2"
	});
	await browser.close();
}

export const isGitHubActions = !!process.env.GITHUB_ACTIONS;
