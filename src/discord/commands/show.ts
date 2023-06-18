import { ApplicationCommandOptionType, AttachmentBuilder } from 'discord.js'
import BaseCommand from '../builder/command'
import { userStates, UserState } from '../manager/state'
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
        name: 'only_this_server',
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
                channel: userState.channelId,
                unix: Date.now(),
                time: Date.now() - userState.joinTime
            })
        }

        const onlyThisServer = interaction.inGuild() ? interaction.options.getBoolean('only_this_server') ?? false : false
        const statistics = utils.calcurateStatistics(userHistorys, 'month', onlyThisServer ? interaction.guild!.id : undefined)

        // VCに通話したことがなければ終了
        if (!statistics.vcJoinCount) {
            return interaction.reply(`${targetUser.username} さんの通話履歴が見つかりませんでした。\n3分以上VCをすることで記録を見ることができるようになります。`)
        }

        // グラフを生成
        const attachment = new AttachmentBuilder(await utils.renderChart(statistics.chartData!), {
            name: 'chart.png'
        })

        interaction.reply({
            embeds: [{
                color: targetUser.accentColor ?? undefined,
                timestamp: new Date().toISOString(),
                footer: {
                    text: `記録開始日: ${statistics.firstJoinDate}`
                },
                author: {
                    name: `${targetUser.username}さんの${onlyThisServer ? interaction.guild!.name : '全サーバー'}でのVC記録`,
                    icon_url: targetUser.displayAvatarURL()
                },
                description: `
                    ### :speaker: 通話時間
                    今日の通話時間: **${statistics.today}**
                    過去一週間の合計通話時間: **${statistics.weekly}**
                    過去一ヶ月間の合計通話時間: **${statistics.monthly}**
                    ### :bar_chart: 統計
                    累計通話時間: **${statistics.total}**
                    平均通話時間: **${statistics.average}**
                    ### :trophy: 実績
                    最長記録: **${statistics.longest} (${statistics.longestTimeDate})**
                    通話した回数: **${statistics.vcJoinCount}回**
                `.replace(/    /g, ''),
                image: {
                    url: 'attachment://chart.png'
                }
            }],
            files: [attachment]
        })
    }
})