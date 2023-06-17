import { Client, ClientEvents } from 'discord.js'

export default class BaseEvent<T extends keyof ClientEvents> {
    public readonly type!: keyof ClientEvents
    public readonly execute!: (client: Client, ...params: ClientEvents[T]) => void

    constructor(props: Fields<BaseEvent<T>>) {
        Object.assign(this, props)
    }
}
