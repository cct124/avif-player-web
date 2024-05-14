var workerScript = "onmessage=function(e){console.log(\"Worker: Message received from main script\");var s=e.data[0]*e.data[1];if(isNaN(s))postMessage(\"Please write two numbers\");else{var a=\"Result: \"+s;console.log(\"Worker: Posting message back to main script\"),postMessage(a)}};";

const blob = new Blob([workerScript], { type: "text/javascript" });
const workerUrl = URL.createObjectURL(blob);
// const WORKER = "%cWORKER_FILE_URL%c";
// if (window.Worker) {
//   const myWorker = new Worker("worker.js");
//   [first, second].forEach((input) => {
//     input.onchange = function () {
//       myWorker.postMessage([first.value, second.value]);
//       console.log("Message posted to worker");
//     };
//   });
//   myWorker.onmessage = function (e) {
//     result.textContent = e.data;
//     console.log("Message received from worker");
//   };
// } else {
//   console.log("Your browser doesn't support web workers.");
// }
class Libavif {
    constructor() {
        this.worker = new Worker(workerUrl);
    }
}

export { Libavif as default };
//# sourceMappingURL=index.js.map
