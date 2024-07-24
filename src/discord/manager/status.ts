import { client } from '@/discord'
import { getHistory } from '@/database'
import { userStates } from './state'

export function update() {
    const length = userStates.size
    const status = length ? `${length}人を計測中` : ''
    client.user?.setActivity(status)
}