import { APIApplicationCommandOption, ChatInputCommandInteraction, PermissionResolvable } from 'discord.js'

export default class BaseCommand {
    public readonly name!: string
    public readonly description!: string
    public readonly options?: APIApplicationCommandOption[]
    public readonly permissions?: PermissionResolvable | PermissionResolvable[]
    public readonly execute!: (interaction: ChatInputCommandInteraction) => void

    constructor(props: Fields<BaseCommand>) {
        Object.assign(this, props)
    }
}