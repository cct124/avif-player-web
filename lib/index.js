var workerScript = "onmessage=e=>{console.log(\"Worker: Message received from main script\");const s=e.data[0]*e.data[1];if(isNaN(s))postMessage(\"Please write two numbers\");else{const e=\"Result: \"+s;console.log(\"Worker: Posting message back to main script\"),postMessage(e)}};";

const blob = new Blob([workerScript], { type: "text/javascript" });
const workerUrl = URL.createObjectURL(blob);

class Libavif {
    constructor() {
        this.worker = new Worker(workerUrl);
    }
}

export { Libavif as default };
//# sourceMappingURL=index.js.map
