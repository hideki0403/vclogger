import { APIApplicationCommandOption, ChatInputCommandInteraction } from 'discord.js'

export default class BaseCommand {
    public readonly name!: string
    public readonly description!: string
    public readonly options?: APIApplicationCommandOption[]
    public readonly execute!: (interaction: ChatInputCommandInteraction) => void

    constructor(props: Fields<BaseCommand>) {
        Object.assign(this, props)
    }
}