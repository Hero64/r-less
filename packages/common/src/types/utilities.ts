export type KeyOfClass<E extends Function> = keyof E['prototype'];

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type OnlyNumberString<T> = {
  [key in keyof T as T[key] extends string | number ? key : never]: T[key];
};
