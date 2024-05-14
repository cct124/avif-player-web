import path from 'path';
import ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { minify } from 'terser';
import { fileURLToPath } from 'url';

const WORKER_FILE_URL = "%cWORKER_FILE_URL%c"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function inlineWorker() {
    return {
        name: 'rollup-plugin-inline-worker', // 此名称将出现在警告和错误中
        resolveId(source) {
            if (source === 'worker.ts') {
                return source; // 表示这个模块由本插件处理
            }
            return null;
        },
        async load(id) {
            if (id.endsWith('worker.ts')) {
                if (existsSync(id) && !id.endsWith('/')) {
                    const code = readFileSync(id, 'utf-8');
                    // 使用 TypeScript API 编译
                    const { outputText } = ts.transpileModule(code, {
                        compilerOptions: { module: ts.ModuleKind.ESNext },
                    });
                    const output = await minify(outputText)
                    return `export default ${JSON.stringify(output.code.replace(/export default.*/, ''))};`;
                } else {
                    this.error(`File not found or is a directory: ${id}`);
                }
            }
            return null;
        },
        // async transform(code, id) {
        //     if (path.basename(id) === 'index.ts') {
        //         // 获取当前文件的目录。`id` 是当前模块的绝对路径。
        //         const currentDir = path.dirname(id);
        //         // 解析 worker.ts 的绝对路径
        //         const workerFilePath = path.resolve(currentDir, 'worker/worker.ts');
        //         // const workerFilePath = path.resolve(__dirname, 'worker.ts');
        //         const workerCode = readFileSync(workerFilePath, 'utf-8');

        //         // 使用 TypeScript API 编译
        //         const compiledWorker = ts.transpileModule(workerCode, {
        //             compilerOptions: { module: ts.ModuleKind.CommonJS },
        //         });

        //         const minified = await minify(compiledWorker.outputText);
        //         // const blob = new Blob([minified.code], { type: 'text/javascript' });
        //         // const workerUrl = URL.createObjectURL(blob);

        //         code = code.replace(WORKER_FILE_URL, minified);

        //         return {
        //             code,
        //             map: null // If source maps are not handled
        //         };
        //     }
        // }
    };
}