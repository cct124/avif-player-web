import typescript from '@rollup/plugin-typescript';
import inlineWorker from './build/rollup-plugin-inline-worker.js';
// import terser from '@rollup/plugin-terser';

export default [
    {
        input: 'src/Worker/worker.ts',
        output: [
            {
                dir: 'lib',
                name: "worker",
                format: "iife",
                sourcemap: true,
            }
        ],
        plugins: [typescript()]
    },
    {
        input: 'src/index.ts',
        output: [
            {
                dir: 'lib',
                format: "es",
                sourcemap: true,
                freeze: true,
            }
        ],
        plugins: [inlineWorker(), typescript()]
    },
];