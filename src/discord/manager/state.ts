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

export function joinVoiceChannel(state: VoiceState) {
    // botの場合は無視
    if (state.member?.user.bot) return

    // もし既に参加していた場合は無視
    if (userStates.has(state.id)) return

    userStates.set(state.id, {
        serverId: state.guild.id,
        channelId: state.channelId!,
        joinTime: Date.now(),
    })

    log.info(`UserJoin: ${state.member?.user.username} (${moment().format('YYYY/MM/DD HH:mm:ss')})`)

    // もしサーバー内で通話をしていなかった場合は通話開始メッセージを送信
    const guild = state.guild
    if (!serverStates.has(guild.id)) {
        serverStates.set(guild.id, {
            globalStartTime: Date.now(),
            channels: new Map(),
        })

        guild.systemChannel!.send({
            content: '@everyone',
            embeds: [{
                color: 0xA3BE8C,
                timestamp: new Date().toISOString(),
                author: {
                    name: '通話開始',
                    icon_url: state.member!.displayAvatarURL()
                },
                description: `${state.member!.displayName}さんが${state.channel!.name} (<#${state.channelId}>)で通話を開始しました。 `
            }]
        })
    }

    // channelStateが登録されていなければ登録
    const serverState = serverStates.get(guild.id)
    if (!serverState!.channels.has(state.channelId!)) {
        serverState!.channels.set(state.channelId!, Date.now())
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

    // もしサーバーのデータが存在していなければ終了
    if (!serverStates.has(guild.id)) return

    // 参加していたVCに人が居なければserverManagerから削除
    const serverState = serverStates.get(guild.id)
    if (state.channel!.members.size === 0) {
        // VCをしているサーバー内で進行しているVC数が残り1なら通話終了メッセージを送信
        if (serverState!.channels.size === 1) {
            // 通話に参加した人数を取得
            const records = database.getHistory({
                server: guild.id,
                after: serverState!.globalStartTime,
            })

            const userCount = Array.from(new Set(records.map(x => x.user))).length

            // 通話終了メッセージを送信
            guild.systemChannel!.send({
                embeds: [{
                    color: 0xBF616A,
                    timestamp: new Date().toISOString(),
                    author: {
                        name: '通話終了'
                    },
                    description: `
                        ${state.channel!.name} (<#${state.channelId}>)での通話が終了しました。

                        通話時間: **${utils.getTime(Date.now() - (serverState!.channels.get(state.channelId!) as number), true)}**
                        参加人数: **${userCount}人**
                    `.replace(/  +/g, '')
                }]
            })
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