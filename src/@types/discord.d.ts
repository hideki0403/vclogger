import { Client } from 'discord.js'
import BaseCommand from '@/discord/builder/command'

declare module 'discord.js' {
    interface Client {
        commands: Map<string, BaseCommand>
    }
}