import typescript from '@rollup/plugin-typescript';
import inlineWorker from './build/rollup-plugin-inline-worker.js';

export default [
    {
        input: 'src/worker/worker.ts',
        output: [
            {
                dir: 'lib',
                name: "worker",
                format: "iife",
                sourcemap: true,
            }
        ],
        watch: {
            include: [
                "src/**",
                "src/index.ts"
            ],
        },
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
        watch: {
            include: [
                "src/**",
                "src/worker/worker.ts"
            ],
        },
        plugins: [inlineWorker(), typescript()]
    },
];