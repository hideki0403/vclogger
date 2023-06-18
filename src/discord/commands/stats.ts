import { ApplicationCommandOptionType } from 'discord.js'
import BaseCommand from '../builder/command'
import * as database from '@/database'
import * as utils from '@/utils'

export default new BaseCommand({
    name: 'stats',
    description: '全ユーザーの通話の統計を表示します',
    options: [{
        name: 'only_this_server',
        description: 'このサーバーでの通話履歴の統計を表示します',
        type: ApplicationCommandOptionType.Boolean,
        required: false
    }],
    execute: async (interaction) => {
        const globalHistory = database.getGlobalHistory()
        const onlyThisServer = interaction.inGuild() ? interaction.options.getBoolean('only_this_server') ?? false : false
        const statistics = utils.calcurateStatistics(globalHistory, undefined, onlyThisServer ? interaction.guild!.id : undefined)

        // VCに通話したことがなければ終了
        if (!statistics.vcJoinCount) {
            return interaction.reply(`通話履歴がありませんでした`)
        }

        const userCount = Array.from(new Set(globalHistory.map(x => x.user))).length

        interaction.reply({
            embeds: [{
                color: 0x88C0D0,
                timestamp: new Date().toISOString(),
                footer: {
                    text: `記録開始日: ${statistics.firstJoinDate}`
                },
                author: {
                    name: `${onlyThisServer ? interaction.guild?.name : '全サーバー'}の統計`,
                    icon_url: interaction.guild?.iconURL() ?? undefined
                },
                description: `
                    ### :speaker: 通話時間
                    今日の通話時間: **${statistics.today}**
                    過去一週間の合計通話時間: **${statistics.weekly}**
                    過去一ヶ月間の合計通話時間: **${statistics.monthly}**
                    ### :bar_chart: 統計
                    累計通話時間: **${statistics.total}**
                    平均通話時間: **${statistics.average}**
                    最長記録: **${statistics.longest} (${statistics.longestTimeDate})**
                    全ユーザーの通話した回数: **${statistics.vcJoinCount}回**
                    記録されているユーザー数: **${userCount}人**
                `.replace(/    /g, '')
            }]
        })
    }
})