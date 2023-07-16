import BaseEvent from '../builder/event'
import * as state from '../manager/state'
import logger from '@/logger'

const log = logger('Discord')

export default new BaseEvent<'voiceStateUpdate'>({
    type: 'voiceStateUpdate',
    execute: (_, oldState, newState) => {
        // ユーザーがVCに参加した場合
        if (oldState.channelId === null) {
            state.joinVoiceChannel(newState)
        }

        // ユーザーがVCを移動した場合
        if (oldState.channelId !== null && newState.channelId !== null) {
            state.moveVoiceChannel(oldState, newState)
        }

        // ユーザーがVCから退出した場合
        if (newState.channelId === null) {
            state.leaveVoiceChannel(oldState)
        }
    }
})