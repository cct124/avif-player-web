import avifDecodeFileWeb from "../Libavif/avifDecodeFileWeb.min.js";
import { WorkerAvifDecoderMessageChannel } from "../types/WorkerMessageType";
import Libavif from "./Libavif";

export default class InitialAvifDecodeFileWeb {
  libavif?: Libavif;
  constructor() {
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
