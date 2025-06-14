import { ApplicationCommandOptionType, ChannelType } from 'discord.js'
import BaseCommand from '../builder/command'
import * as database from '@/database'

export default new BaseCommand({
    name: 'mute',
    description: '指定したチャンネルの通話に関する通知を有効/無効にします',
    options: [{
        name: 'channel',
        description: '設定を変更したいチャンネル',
        type: ApplicationCommandOptionType.Channel,
        required: true
    }, {
        name: 'enable',
        description: '通知を無効化する',
        type: ApplicationCommandOptionType.Boolean,
        required: true
    }],
    execute: async (interaction) => {
        const channel = interaction.options.getChannel('channel')
        const enableMute = interaction.options.getBoolean('enable') ?? false

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return interaction.reply({ content: '指定されたチャンネルはボイスチャンネルではありません。', ephemeral: true })
        }

        // チャンネル設定を更新
        database.setChannelSettings(channel.id, enableMute)

        interaction.reply({
            content: `チャンネル「${channel.name}」の通話に関する通知を${enableMute ? '無効' : '有効'}にしました。`
        })
    }
})