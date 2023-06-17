import { ApplicationCommandOptionType } from 'discord.js'
import BaseCommand from '../builder/command'
import { userStates, UserState } from '../stateManager'
import * as database from '@/database'
import * as utils from '@/utils'

export default new BaseCommand({
    name: 'show',
    description: 'これまでの通話の統計を表示します',
    options: [{
        name: 'user',
        description: '統計を表示したいユーザー',
        type: ApplicationCommandOptionType.User,
        required: false
    }, {
        name: 'onlyThisServer',
        description: 'このサーバーでの通話履歴の統計を表示します',
        type: ApplicationCommandOptionType.Boolean,
        required: false
    }],
    execute: async (interaction) => {
        const targetUser = interaction.options.getUser('user') ?? interaction.user

        // アクセントカラーがなければ強制fetch
        if (!targetUser.accentColor) {
            await targetUser.fetch(true)
        }

        const userHistorys = database.getUserHistory(targetUser.id)

        // 現在の通話状態を反映
        if (userStates.has(targetUser.id)) {
            const userState = userStates.get(targetUser.id) as UserState
            userHistorys.push({
                user: targetUser.id,
                server: userState.serverId,
                unix: Date.now(),
                time: Date.now() - userState.joinTime
            })
        }

        const onlyThisServer = interaction.inGuild() ? interaction.options.getBoolean('onlyThisServer') ?? false : false
        const statistics = utils.calcurateStatistics(userHistorys, onlyThisServer ? interaction.guild!.id : undefined)

        // VCに参加したことがなければ終了
        if (!statistics.vcJoinCount) {
            return interaction.reply(`${targetUser.username} さんの通話履歴が見つかりませんでした。\n3分以上VCをすることで記録を見ることができるようになります。`)
        }

        interaction.reply({
            embeds: [{
                color: targetUser.accentColor ?? undefined,
                timestamp: Date.now().toString(),
                footer: {
                    text: `記録開始日: ${statistics.firstJoinDate}`
                },
                author: {
                    name: `${targetUser.username}さんの${onlyThisServer ? interaction.guild!.name : '全サーバー'}でのVC記録`,
                    icon_url: targetUser.displayAvatarURL()
                },
                description: `
                    > :speaker: **参加時間**
                    今日の参加時間: **${statistics.today}**
                    過去一週間の合計参加時間: **${statistics.weekly}**
                    過去一ヶ月間の合計参加時間: **${statistics.monthly}**
                    これまでの累計参加時間: **${statistics.total}**

                    > :trophy: **実績**
                    最長記録: **${statistics.longest} (${statistics.longestTimeDate})**
                    参加した回数: **${statistics.vcJoinCount}回**
                `.replace(/    /g, '')
            }]
        })
    }
})