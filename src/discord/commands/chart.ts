import { ApplicationCommandOptionType, AttachmentBuilder } from 'discord.js'
import BaseCommand from '../builder/command'
import * as database from '@/database'
import * as utils from '@/utils'

export default new BaseCommand({
    name: 'chart',
    description: '通話時間をグラフで表示します',
    options: [{
        name: 'user',
        description: '統計を表示したいユーザー',
        type: ApplicationCommandOptionType.User,
        required: false
    }, {
        name: 'range',
        description: '集計する期間',
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [{
            name: '1週間',
            value: 'week'
        }, {
            name: '1ヶ月',
            value: 'month'
        }, {
            name: '1年',
            value: 'year'
        }]
    }, {
        name: 'only_this_server',
        description: 'このサーバーでの通話履歴の統計を表示します',
        type: ApplicationCommandOptionType.Boolean,
        required: false
    }],
    execute: async (interaction) => {
        const targetUser = interaction.options.getUser('user') ?? interaction.user
        const range = interaction.options.getString('range') ?? 'month'
        const onlyThisServer = interaction.inGuild() ? interaction.options.getBoolean('only_this_server') ?? false : false

        // アクセントカラーがなければ強制fetch
        if (!targetUser.accentColor) {
            await targetUser.fetch(true)
        }

        const userHistorys = database.getHistory({
            user: targetUser.id,
            server: onlyThisServer ? interaction.guild?.id : undefined,
            after: utils.getRangeDate(range as any)
        })

        const statistics = utils.calcurateStatistics(userHistorys, range as any)

        // VCに通話したことがなければ終了
        if (!statistics.vcJoinCount) {
            return interaction.reply(`${targetUser.username} さんの通話履歴が見つかりませんでした。\n3分以上VCをすることで記録を見ることができるようになります。`)
        }

        // グラフを生成
        const attachment = new AttachmentBuilder(utils.renderChart(statistics.chartData!), {
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
                image: {
                    url: 'attachment://chart.png'
                }
            }],
            files: [attachment]
        })
    }
})