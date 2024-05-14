import typescript from '@rollup/plugin-typescript';
import inlineWorker from './build/rollup-plugin-inline-worker.js';

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                dir: 'lib',
                name: "SoftAvifWeb",
                format: "es",
                sourcemap: true,
                freeze: false,
            }
        ],
        external: [],
        watch: {
            include: "src/**",
        },
        plugins: [inlineWorker(), typescript()]
    }
];