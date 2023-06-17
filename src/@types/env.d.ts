declare module 'process' {
    global {
        namespace NodeJS {
            interface ProcessEnv {
                TOKEN: string | undefined
            }
        }
    }
}