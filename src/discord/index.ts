import { Client, GatewayIntentBits, Events } from 'discord.js'
import logger from '@/logger'

const log = logger('Discord')
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages] })

client.once(Events.ClientReady, () => {
    log.info(`Ready... (${client.user?.tag}})`)
})

client.on(Events.InteractionCreate, async (interaction) => {
    
})

export function initialize() {
    if (!process.env.TOKEN) {
        log.error('No token provided')
        process.exit(1)
    }
    
    client.login(process.env.TOKEN)
}