import BaseEvent from '../builder/event'
import * as interactionManager from '../manager/interaction'
import * as statusManager from '../manager/status'
import logger from '@/logger'

const log = logger('Discord')

export default new BaseEvent<'ready'>({
    type: 'ready',
    execute: (client) => {
        log.info(`Logged in as ${client.user?.tag}!`)
        interactionManager.update()
        statusManager.update()
    }
})