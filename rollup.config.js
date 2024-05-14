import typescript from '@rollup/plugin-typescript';

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
        plugins: [typescript()]
    }
];