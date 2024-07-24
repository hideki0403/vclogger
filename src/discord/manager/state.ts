import type { Guild, VoiceState } from 'discord.js'
import moment from 'moment'
import logger from '@/logger'
import * as statusManager from '@/discord/manager/status'
import * as database from '@/database'
import * as utils from '@/utils'


const log = logger('StateManager')

export type UserState = {
    joinTime: number,
    serverId: string,
    channelId: string,
}

export type ServerState = {
    globalStartTime: number,
    channels: Map<string, number>,
}

export const userStates = new Map<string, UserState>()
export const serverStates = new Map<string, ServerState>()

const ANNOUNCE_DELAY = 15000
const announceQueue = new Set<string>()

export function joinVoiceChannel(state: VoiceState) {
    // botの場合は無視
    if (state.member?.user.bot) return

    // もし既に参加していた場合は無視
    if (userStates.has(state.id)) return

    const currentTime = Date.now()

    userStates.set(state.id, {
        serverId: state.guild.id,
        channelId: state.channelId!,
        joinTime: currentTime,
    })

    log.info(`UserJoin: ${state.member?.user.username} (${moment().format('YYYY/MM/DD HH:mm:ss')})`)

    // もしサーバー内で通話をしていなかった場合は通話開始メッセージを送信
    const guild = state.guild
    if (!serverStates.has(guild.id)) {
        serverStates.set(guild.id, {
            globalStartTime: currentTime,
            channels: new Map(),
        })

        if (!announceQueue.has(guild.id)) {
            announceQueue.add(guild.id)

            // 15秒後に通話開始メッセージを送信
            setTimeout((targetGuild, voiceState) => {
                announceQueue.delete(targetGuild.id)
                const targetState = serverStates.get(targetGuild.id)

                // もしそれまでに通話を終了していれば送信せず終わる
                if (!targetState) return
                targetGuild.systemChannel?.send({
                    content: '@everyone',
                    embeds: [{
                        color: 0xA3BE8C,
                        timestamp: new Date(targetState.globalStartTime).toISOString(),
                        author: {
                            name: '通話開始',
                            icon_url: voiceState.member!.displayAvatarURL()
                        },
                        description: `${voiceState.member!.displayName}さんが${voiceState.channel!.name} (<#${voiceState.channelId}>)で通話を開始しました。 `
                    }]
                })
            }, ANNOUNCE_DELAY, guild, state)
        }
    }

    // channelStateが登録されていなければ登録
    const serverState = serverStates.get(guild.id)
    if (!serverState!.channels.has(state.channelId!)) {
        serverState!.channels.set(state.channelId!, currentTime)
    }

    // statusを更新
    statusManager.update()
}

export function moveVoiceChannel(oldState: VoiceState, newState: VoiceState) {
    const serverState = serverStates.get(newState.guild.id)

    // channelStateが登録されていなければ登録
    if (!serverState!.channels.has(newState.channelId!)) {
        serverState!.channels.set(newState.channelId!, Date.now())
    }

    // 1人だけで移動した場合に終了メッセージが表示されないので対象のチャンネルを削除する
    if (oldState.channel!.members.size === 0) serverState!.channels.delete(oldState.channelId!)
}

export function leaveVoiceChannel(state: VoiceState) {
    // 参加データが存在する場合のみ記録
    if (userStates.has(state.id)) {
        const userState = userStates.get(state.id)
        database.insertHistory(state.id, userState!)

        log.info(`UserLeft: ${state.member!.user.username} (${moment().format('YYYY/MM/DD HH:mm:ss')})`)

        // 参加データを削除
        userStates.delete(state.id)

        // statusを更新
        statusManager.update()
    }

    const guild = state.guild

    const serverState = serverStates.get(guild.id)

    // もしサーバーのデータが存在していなければ終了
    if (!serverState) return

    // 参加していたVCに人が居なければserverManagerから削除
    if (state.channel!.members.size === 0) {
        // VCをしているサーバー内で進行しているVC数が残り1なら通話終了メッセージを送信
        if (serverState.channels.size === 1) {
            // 通話に参加した人数を取得
            const records = database.getHistory({
                server: guild.id,
                after: serverState.globalStartTime,
            })

            const userCount = Array.from(new Set(records.map(x => x.user))).length
            const currentTime = Date.now()

            // 通話開始メッセージが送信されていれば通話終了メッセージを送信
            if (currentTime - serverState.globalStartTime > ANNOUNCE_DELAY) {
                guild.systemChannel?.send({
                    embeds: [{
                        color: 0xBF616A,
                        timestamp: new Date().toISOString(),
                        author: {
                            name: '通話終了'
                        },
                        description: `
                        ${state.channel!.name} (<#${state.channelId}>)での通話が終了しました。

                        通話時間: **${utils.getTime(currentTime - (serverState!.channels.get(state.channelId!) as number), true)}**
                        参加人数: **${userCount}人**
                    `.replace(/  +/g, '')
                    }]
                })
            }
        }

        // チャンネルのキャッシュを削除
        serverState!.channels.delete(state.channelId!)

        // キャッシュされているチャンネル数が0ならserverManagerから削除
        if (!serverState!.channels.size) serverStates.delete(guild.id)
    }
}

export async function resetStates(guild: Guild) {
    userStates.forEach((state, id) => {
        if (state.serverId === guild.id) {
            database.insertHistory(id, state)
            userStates.delete(id)
        }
    })
    serverStates.delete(guild.id)

    guild.voiceStates.cache.forEach(state => {
        joinVoiceChannel(state)
    })

    log.info(`Successfully reset states for ${guild.id}`)
}

export function saveStates() {
    userStates.forEach((state, id) => {
        database.insertHistory(id, state)
    })

    log.info('Successfully saved userStates')
}