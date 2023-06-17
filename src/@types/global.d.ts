// ref: https://zenn.dev/karibash/articles/1c07480a45cf04

type KeysOfType<T, S> = {
    [key in keyof T]: S extends T[key] ? key : never
}[keyof T]

type Fields<T> = Omit<T, KeysOfType<T, undefined>> & Partial<Pick<T, KeysOfType<T, undefined>>>