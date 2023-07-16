import BaseCommand from '../builder/command'
import { resetStates } from '../manager/state'

export default new BaseCommand({
    name: 'resync',
    description: '通話状況をリセットし、再同期します',
    execute: async (interaction) => {
        if (!interaction.guild) {
            return interaction.reply('このコマンドはサーバー内でのみ使用できます。')
        }

        await resetStates(interaction.guild)

        interaction.reply('同期に成功しました')
    }
})