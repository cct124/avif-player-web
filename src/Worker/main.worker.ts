import avifDecodeFileWeb from "../Libavif/avifDecodeFileWeb.min.js";
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
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

new InitialAvifDecodeFileWeb();
