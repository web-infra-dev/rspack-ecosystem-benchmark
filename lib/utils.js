import { spawn } from "child_process";
import { stat } from "fs/promises";

export async function useAddons(addons, stage, ...args) {
	for (const item of addons) {
		await item[stage](...args);
	}
}

export async function runCommand(
	command,
	args,
	{ verbose = true, env, onData } = {}
) {
	const hasOnData = typeof onData === "function";
	const stdio = verbose ? "inherit" : "ignore";
	const p = spawn(command, args, {
		shell: true,
		stdio: [stdio, hasOnData ? "pipe" : stdio, stdio],
		env: env
			? {
					...process.env,
					...env
			  }
			: undefined
	});
	if (hasOnData) {
		p.stdout.on("data", onData);
	}

	const exitCode = await new Promise(resolve => p.once("exit", resolve));
	if (exitCode !== 0)
		throw new Error(`${command} ${args.join(" ")} failed with ${exitCode}`);
}

export function getType(metric) {
	if (metric.endsWith(" memory")) return "memory";
	if (metric.endsWith(" size")) return "size";
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
	const month = time.getMonth();
	const day = time.getDate();
	return `${year}-${month < 10 ? "0" + month : month}-${
		day < 10 ? "0" + day : day
	}`;
}
