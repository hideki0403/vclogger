import { Client, ApplicationCommandDataResolvable } from 'discord.js'
import logger from '@/logger'

const log = logger('Discord')
const pickKeys = ['name', 'description', 'type', 'options'] as const

export async function update(client: Client, deployTarget?: string) {
    const data = Array.from(client.commands.values()).map(command => {
        return Object.fromEntries(Object.entries(command).filter(([key]) => pickKeys.includes(key as any))) as ApplicationCommandDataResolvable
    })

    await client.application?.commands.set(data, deployTarget as string)
    log.info(`SlashCommands was deployed to ${deployTarget ?? 'global'}`)
}