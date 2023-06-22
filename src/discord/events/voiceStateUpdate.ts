import moment from 'moment'
import BaseEvent from '../builder/event'
import * as interactionManager from '../manager/interaction'
import * as statusManager from '../manager/status'
import { userStates, serverStates } from '../manager/state'
import logger from '@/logger'
import * as database from '@/database'
import * as utils from '@/utils'

const log = logger('Discord')

export default new BaseEvent<'voiceStateUpdate'>({
    type: 'voiceStateUpdate',
    execute: (client, oldState, newState) => {
        // ユーザーがVCに参加した場合
        if (oldState.channelId === null && !newState.member?.user.bot) {
            userStates.set(newState.id, {
                serverId: newState.guild.id,
                channelId: newState.channelId!,
                joinTime: Date.now(),
            })

            log.info(`UserJoin: ${newState.member?.user.username} (${moment().format('YYYY/MM/DD HH:mm:ss')})`)

            // もしサーバー内で通話をしていなかった場合は通話開始メッセージを送信
            const guild = newState.guild
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
                            icon_url: newState.member!.displayAvatarURL()
                        },
                        description: `${newState.member!.displayName}さんが${newState.channel!.name} (<#${newState.channelId}>)で通話を開始しました。 `
                    }]
                })
            }

            // channelStateが登録されていなければ登録
            const serverState = serverStates.get(guild.id)
            if (!serverState!.channels.has(newState.channelId!)) {
                serverState!.channels.set(newState.channelId!, Date.now())
            }
        }

        // ユーザーがVCを移動した場合
        if (oldState.channelId !== null && newState.channelId !== null) {
            const serverState = serverStates.get(newState.guild.id)

            // channelStateが登録されていなければ登録
            if (!serverState!.channels.has(newState.channelId!)) {
                serverState!.channels.set(newState.channelId!, Date.now())
            }

            // 1人だけで移動した場合に終了メッセージが表示されないので対象のチャンネルを削除する
            if (oldState.channel!.members.size === 0) serverState!.channels.delete(oldState.channelId!)
        }

        // ユーザーがVCから退出した場合
        if (newState.channelId === null) {
            // 参加データが存在する場合のみ記録
            if (userStates.has(oldState.id)) {
                const userState = userStates.get(oldState.id)
                const nowTime = Date.now()

                // 参加時間が3分以上だった場合にDBにレコード突っ込む
                if ((nowTime - userState!.joinTime) > 3 * 60 * 1000) {
                    database.insertHistory(oldState.id, userState!.serverId, userState!.channelId, userState!.joinTime, nowTime - userState!.joinTime)
                }

                log.info(`UserLeft: ${newState.member!.user.username} (${moment().format('YYYY/MM/DD HH:mm:ss')})`)

                // 参加データを削除
                userStates.delete(oldState.id)
            }

            const guild = oldState.guild

            // もしサーバーのデータが存在していなければ終了
            if (!serverStates.has(guild.id)) return

            // 参加していたVCに人が居なければserverManagerから削除
            const serverState = serverStates.get(guild.id)
            if (oldState.channel!.members.size === 0) {
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
                                ${oldState.channel!.name} (<#${oldState.channelId}>)での通話が終了しました。

                                通話時間: **${utils.getTime(Date.now() - (serverState!.channels.get(oldState.channelId!) as number), true)}**
                                参加人数: **${userCount}人**
                            `.replace(/  +/g, '')
                        }]
                    })
                }

                // チャンネルのキャッシュを削除
                serverState!.channels.delete(oldState.channelId!)

                // キャッシュされているチャンネル数が0ならserverManagerから削除
                if (!serverState!.channels.size) serverStates.delete(guild.id)
            }
        }

        // statusを更新
        statusManager.update(client)
    }
})