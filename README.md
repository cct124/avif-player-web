# avif-player-web

> 使用 webassembly 播放 AVIF 动画文件

[![npm version](https://badge.fury.io/js/avif-player-web.svg)](https://www.npmjs.com/package/avif-player-web)

## Installation

```shell
# npm
npm i avif-player-web

# yarn
yarn add avif-player-web
```

## Example

```typescript
import AvifPlayerWeb, { AvifPlayerWebChannel } from "avif-player-web";

const avifPlayerWeb = new AvifPlayerWeb(animSrc4, canvas.value!, {
  autoplay: true,
  webgl: false,
});

avifPlayerWeb.on(AvifPlayerWebChannel.frameIndexChange, (data) => {
  console.log(data.index);
});
```
