import { ApplicationCommandOptionType } from 'discord.js'
import BaseCommand from '../builder/command'
import * as database from '@/database'
import * as utils from '@/utils'
import moment from 'moment'

export default new BaseCommand({
    name: 'ranking',
    description: 'ランキングを表示します',
    options: [{
        name: 'global',
        description: '全サーバーでのランキングを表示します',
        type: ApplicationCommandOptionType.Boolean,
        required: false
    }, {
        name: 'range',
        description: '集計期間を指定します (デフォルト: 全期間)',
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [{
            name: '過去1週間',
            value: 'week'
        }, {
            name: '過去1ヶ月間',
            value: 'month'
        }, {
            name: '過去1年間',
            value: 'year'
        }, {
            name: '全期間',
            value: 'all'
        }]
    },{
        name: 'page',
        description: 'ページを指定します',
        type: ApplicationCommandOptionType.Integer,
        required: false,
        min_value: 1
    }],
    execute: async (interaction) => {
        const isGlobalRanking = interaction.inGuild() ? interaction.options.getBoolean('global') ?? false : true
        const range = interaction.options.getString('range') ?? 'all'
        const page = Math.max(interaction.options.getInteger('page') ?? 1, 1)
        const ppu = 10 // per page user count
        const rangeDate = range !== 'all' ? utils.getRangeDate(range as any) : undefined

        const globalHistory = database.getHistory({
            server: isGlobalRanking ? undefined : interaction.guild?.id,
            after: rangeDate
        })

        // 通話履歴がなければ終了
        if (!globalHistory.length) {
            return interaction.reply(`通話履歴がありませんでした`)
        }

        // 履歴順からユーザーごとに集計
        const userStats = {} as Record<string, number>
        for (const record of globalHistory) {
            if (!userStats[record.user]) {
                userStats[record.user] = 0
            }

            userStats[record.user] += record.time
        }

        const sortedUserStats = Object.entries(userStats).sort((a, b) => b[1] - a[1]).map(x => ({
            user: x[0],
            time: x[1]
        }))
        const maxPage = Math.ceil(sortedUserStats.length / ppu)

        if (page > maxPage) {
            return interaction.reply(`ページが存在しません (${maxPage}以下で指定してください)`)
        }

        // ページごとに分割
        const pageUserStats = sortedUserStats.slice((page - 1) * ppu, page * ppu)
        const leaderBoard = []
        for (let i = 0; i < pageUserStats.length; i++) {
            const stat = pageUserStats[i]
            const place = ((page - 1) * ppu) + i + 1
            const text = []
            
            if (place === 1) {
                text.push(':first_place:')
            }

            if (place === 2) {
                text.push(':second_place:')
            }

            if (place === 3) {
                text.push(':third_place:')
            }

            if (place > 3 && place <= 10 && isGlobalRanking) {
                text.push(':medal:')
            }

            text.push(`${place}位 <@${stat.user}>: **${utils.getTime(stat.time, true)}**`)

            leaderBoard.push(text.join(' '))
        }

        const userCount = sortedUserStats.length
        const meRank = sortedUserStats.findIndex(x => x.user === interaction.user.id) + 1

        interaction.reply({
            embeds: [{
                color: 0x88C0D0,
                timestamp: new Date().toISOString(),
                footer: {
                    text: `ページ: ${page} / ${maxPage}`
                },
                author: {
                    name: `${isGlobalRanking ? '全ユーザー' : interaction.guild?.name}のランキング`,
                    icon_url: interaction.guild?.iconURL() ?? undefined
                },
                description: `
                    ${leaderBoard.join('\n') }

                    あなたの順位: **${meRank}位** (${userCount}人中)
                    集計期間: ${range !== 'all' ? moment(rangeDate).format('YYYY/MM/DD') : ''} ~ ${moment().format('YYYY/MM/DD')}
                `.replace(/    /g, ''),
            }]
        })
    }
})