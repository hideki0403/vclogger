import { EmbedBuilder } from 'discord.js'

export function error(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor('#BF616A')
        .setDescription(message)
}
