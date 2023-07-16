import { ApplicationCommandOptionType } from 'discord.js'
import BaseCommand from '../builder/command'
import { update as updateInteraction } from '../manager/interaction'

export default new BaseCommand({
    name: 'deploy',
    description: '最新のスラッシュコマンドをデプロイします',
    permissions: 'Administrator',
    options: [{
        name: 'guild_id',
        description: '対象のサーバーIDを指定します',
        type: ApplicationCommandOptionType.String,
        required: false,
    }],
    execute: async (interaction) => {
        const result = await updateInteraction(true, interaction.options.getString('guild_id') ?? undefined)
        interaction.reply(result ? 'デプロイに成功しました' : 'デプロイに失敗しました')
    }
})