import path from 'path';
import { readFileSync } from 'fs';

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
                const workerCode = readFileSync(path.resolve(process.cwd(), 'lib/worker.js'), 'utf-8');
                return `export default ${JSON.stringify(workerCode)};`;
            }
            return null;
        },
    };
}