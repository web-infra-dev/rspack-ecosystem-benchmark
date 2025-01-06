import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const getRandomTable = JSON.parse(await fs.readFile(
	path.resolve(__dirname, "./code-splitting-case-random-table.json")
));

export const NUM_STATIC_MODULES = 10_000;
export const NUM_STATIC_IMPORTS_PER_MODULE = 10;
export const NUM_REUSE_IMPORTS_PER_MODULE = 3;

const CONTEXT = path.resolve(__dirname, "../cases/large-dyn-imports/src");

async function genStaticLeafModule(index) {
	const code = `import React from 'react'

function Navbar({ show }) {
	return (
		<div>
			{show}
		</div>
	)
}

export default Navbar`;

	await fs.mkdir(path.join(CONTEXT, "./leaves"), { recursive: true });
	await fs.writeFile(
		path.join(CONTEXT, `./leaves/Component-${index}.jsx`),
		code
	);
}

const generated = new Set();

export async function generateCodeSplittingCase() {
	await genDynamicModule();
}

async function genDynamicModule(index = 0) {
	if (generated.has(index)) return false;
	generated.add(index);
	if (index >= NUM_STATIC_MODULES) return false;

	const access = [];
	const staticImports = [];

	const promises = [];
	for (let i = index; i < index + NUM_STATIC_IMPORTS_PER_MODULE; i++) {
		staticImports.push(`import Comp${i} from '../leaves/Component-${i}.jsx';`);
		promises.push(genStaticLeafModule(i));
		access.push(`Comp${i}`);
	}
	await Promise.all(promises);

	const reusedStaticImports = [];

	const randomTable = await getRandomTable;
	const depth = index / NUM_STATIC_IMPORTS_PER_MODULE;

	for (let i = 0; i < randomTable[depth].length; i++) {
		const randomIdx = randomTable[depth][i];
		reusedStaticImports.push(
			`import Comp${randomIdx} from '../leaves/Component-${randomIdx}.jsx'`
		);
		access.push(`Comp${randomIdx}`);
	}

	const dynamicImports = [];
	if ((await genDynamicModule(index + NUM_STATIC_IMPORTS_PER_MODULE)) !== false) {
		dynamicImports.push(`import('./dynamic-${depth + 1}.jsx')`);
	}

	const code = `// static imports
${staticImports.join("\n")}

// reuse imports
${reusedStaticImports.join("\n")}

// access data
${access.join("\n")}

// dynamic import
${dynamicImports.join("\n")}

export default ${index};`;

	await fs.mkdir(path.join(CONTEXT, "./dynamic"), { recursive: true });
	await fs.writeFile(
		path.join(CONTEXT, `./dynamic/dynamic-${depth}.jsx`),
		code
	);
}
