import { ApplicationCommandDataResolvable } from 'discord.js'
import { client } from '@/discord'
import logger from '@/logger'

const log = logger('Discord')
const pickKeys = ['name', 'description', 'type', 'options'] as const

export async function update(force = false, targetGuildId?: string) {
    const deploy = process.argv.find(x => x.startsWith('--deploy'))
    if (!deploy && !force) return false

    const targetGuild = targetGuildId ?? (deploy?.includes('=') ? deploy.split('=')[1] : null)
    const data = Array.from(client.commands.values()).map(command => {
        return Object.fromEntries(Object.entries(command).filter(([key]) => pickKeys.includes(key as any))) as ApplicationCommandDataResolvable
    })

    try {
        await client.application?.commands.set(data, targetGuild as string)
        log.info(`SlashCommands was deployed to ${targetGuild ?? 'global'}`)
        return true
    } catch (error) {
        log.error(`SlashCommands deploy failed: ${error}`)
        return false
    }
}