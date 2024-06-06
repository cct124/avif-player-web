import avifDecodeFileWeb from "../Libavif/avifDecodeFileWeb.min.js";
import { WorkerAvifDecoderMessageChannel } from "../types/WorkerMessageType";
import Libavif from "./Libavif";

self.onmessage = (e) => {
  const res = e.data[0] + e.data[1];
  self.postMessage(res);
};

export default class InitialAvifDecodeFileWeb {
  libavif?: Libavif;
  constructor() {
    self.postMessage([10, "libavif"]);
    this.initialAvifDecodeFileWeb();
  }

  async initialAvifDecodeFileWeb() {
    try {
      const AvifDecodeFileWeb = await avifDecodeFileWeb();
      this.libavif = new Libavif(AvifDecodeFileWeb);
      this.libavif.on(
        WorkerAvifDecoderMessageChannel.avifDecoderDestroy,
        () => {
          self.close();
        }
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

new InitialAvifDecodeFileWeb();
