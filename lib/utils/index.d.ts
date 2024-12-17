/**
 * # 深度混入
 * `obj1`混入`obj2`中
 * ## Example
 * 给一个对象赋予默认值
 *
 * 如果`options`不存在`buttons`，则`obj1`的`buttons`的值就是输出对象`this.options`的`buttons`值
 * ```ts
 * this.options = deepMixins(
      options,
      {
        buttons: [],
      }
    );
 * ```
 * @param obj1 原始对象
 * @param obj2 混入对象
 * @returns
 */
export declare function deepMixins<T extends {
    [key: string]: any;
}>(obj2: T, obj1: {
    [key: string]: any;
}): T;
/**
 * 基于 [requestAnimationFrame](https://developer.mozilla.org/zh-CN/docs/Web/API/window/requestAnimationFrame) 实现的定时器
 * @param callback
 * @param ms
 */
export declare function timeout(callback: (elapsed: number) => void, ms?: number): void;
export declare function sleep(delay: number): Promise<number>;
export declare function isNumeric(num: number): boolean;
/**
 * 快速生成唯一id
 * @returns
 */
export declare function generateQuickUniqueId(): number;
export declare function fetchText(uri: string): Promise<string>;
