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
