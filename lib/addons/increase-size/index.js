import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { $ } from "zx";
import { Addon } from "../common.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FUNCTION_CODE = fs.readFileSync(path.join(__dirname, "react.js"), "utf-8");

let srcDir;

export default class extends Addon {
    async afterSetup(ctx) {
        srcDir = path.join(ctx.caseDir, 'src');

        function addFunctionToFile(filePath) {
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                const updatedData = data + FUNCTION_CODE;
                fs.writeFileSync(filePath, updatedData, 'utf8');
            } catch (err) {
                console.error(`Error processing file ${filePath}:`, err);
            }
        }

        function processDirectory(directory) {
            try {
                const items = fs.readdirSync(directory);
                items.forEach(item => {
                    const itemPath = path.join(directory, item);
                    if (fs.lstatSync(itemPath).isDirectory()) {
                        processDirectory(itemPath);
                    } else if (fs.lstatSync(itemPath).isFile()) {
                        addFunctionToFile(itemPath);
                    }
                });
            } catch (err) {
                console.error(`Error reading directory ${directory}:`, err);
            }
        }

        processDirectory(srcDir);
    }

    async afterTeardown() {
        if (srcDir) {
            await $`git checkout ${srcDir}`;
        }
    }
}
