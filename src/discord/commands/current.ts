import BaseCommand from '../builder/command'
import { userStates, serverStates } from '../manager/state'
import * as database from '@/database'
import * as utils from '@/utils'

export default new BaseCommand({
    name: 'current',
    description: '現在の通話状況を表示します',
    execute: async (interaction) => {
        if (!interaction.inGuild()) {
            return interaction.reply('このコマンドはサーバー内でのみ使用できます。')
        }

        const serverState = serverStates.get(interaction.guildId)
        const userState = userStates.get(interaction.user.id)

        if (!serverState && !userState) {
            return interaction.reply('通話中のチャンネルが無いため、情報を表示できません')
        }

        const text = []

        if (serverState) {
            text.push(`このサーバーで通話が始まってから: **${utils.getTime(Date.now() - serverState.globalStartTime, true)}**`)
        }

        if (userState) {
            text.push(`通話に参加してから: **${utils.getTime(Date.now() - userState.joinTime, true)}**`)
        }

        interaction.reply({
            embeds: [{
                color: 0xA3BE8C,
                timestamp: new Date().toISOString(),
                author: {
                    name: `現在の通話状況`,
                    icon_url: interaction.guild?.iconURL() ?? undefined
                },
                footer: {
                    text: interaction.user.username,
                    icon_url: interaction.user.displayAvatarURL()
                },
                description: text.join('\n')
            }]
        })
    }
})