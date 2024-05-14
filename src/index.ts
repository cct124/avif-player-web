import workerScript from "./worker/worker";

const blob = new Blob([workerScript], { type: "text/javascript" });
const workerUrl = URL.createObjectURL(blob);

export default class Libavif {
  worker: Worker;
  constructor() {
    this.worker = new Worker(workerUrl);
  }
}
