import { Client } from 'discord.js'
import { userStates } from './state'

export function update(client: Client) {
    const length = userStates.size
    const status = length ? `${length}人を計測中 (´･ω･｀)` : '( ˘ω˘)ｽﾔｧ...'
    client.user?.setActivity(status)
}