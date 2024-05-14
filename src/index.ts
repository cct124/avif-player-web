import workerScript from "./worker/worker";

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

export default class Libavif {
  worker: Worker;
  constructor() {
    this.worker = new Worker(workerUrl);
  }
}
