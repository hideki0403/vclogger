import { Client, GatewayIntentBits } from 'discord.js'
import events from './events'
import commands from '@/discord/commands'
import logger from '@/logger'

const log = logger('Discord')
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages] })

events.forEach(event => client.on(event.type, (...args) => event.execute(client, ...args as any)))

client.commands = new Map()
commands.forEach(command => client.commands.set(command.name, command))

export function initialize() {
    if (!process.env.TOKEN) {
        log.error('No token provided')
        process.exit(1)
    }
    
    client.login(process.env.TOKEN)
}