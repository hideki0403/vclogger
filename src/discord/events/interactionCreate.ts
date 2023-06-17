import BaseEvent from '../builder/event'
import { error as errorEmbed } from '../builder/embed'
import logger from '@/logger'

const log = logger('Discord')

export default new BaseEvent<'interactionCreate'>({
    type: 'interactionCreate',
    execute: (client, interaction) => {
        if (!interaction.isChatInputCommand()) return

        const command = client.commands.get(interaction.commandName)
        if (!command) {
            return interaction.reply({ embeds: [errorEmbed('コマンドが見つかりませんでした。\n時間を開けて再度お試しください。')] })
        }

        try {
            command.execute(interaction)
        } catch (error) {
            log.error(error)
            interaction.reply({ embeds: [errorEmbed('コマンドの実行中にエラーが発生しました。\n時間を開けて再度お試しください。')] })
        }

        log.debug(`Command ${command.name} executed by ${interaction.user.tag}`)
    }
})