import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";
import { NUM_STATIC_MODULES, NUM_REUSE_IMPORTS_PER_MODULE, NUM_STATIC_IMPORTS_PER_MODULE } from "./gen-code-splitting-case.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
	const map = []
	for (let i = 0; i < NUM_STATIC_MODULES; i += NUM_STATIC_IMPORTS_PER_MODULE) {
		// imports from i to i + NUM_STATIC_IMPORTS_PER_MODULE
		const depth = i / NUM_STATIC_IMPORTS_PER_MODULE
		map[depth] = []

		// reuse imports
		for (let j = 0; j < NUM_REUSE_IMPORTS_PER_MODULE; j++) {
			let random = Math.round(Math.random() * i);
			if (random < i) {
				if (!map[depth].includes(random)) {
					map[depth].push(random)
				}
			}
		}
	}

	fs.writeFile(path.join(__dirname, `./code-splitting-case-random-table.json`), JSON.stringify(map))
}

main();
