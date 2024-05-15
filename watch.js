import chokidar from "chokidar";
import shell from "shelljs";
import iconv from "iconv-lite";
// 定义要监视的文件
// const fileToWatch = './src/worker.ts';
run();
chokidar.watch(['src/**', 'rollup.config.js']).on('change', (path) => {
    console.log(`${path} has changed. Rebuilding...`);
    // 修改这里的命令以适应你的 Rollup 配置
    // 这里假设 rollup 的配置文件已正确设置，只打包 worker.ts
    run()
});

function run() {
    shell.exec('npm run build:js', (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            return;
        }
        const output = iconv.decode(stdout, 'utf-8');
        const errors = iconv.decode(stderr, 'utf-8');

        console.log(output);
        console.error(errors);
    });
}