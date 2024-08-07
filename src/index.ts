// VC logger
import 'dotenv/config'
import logger from '@/logger'
import * as database from '@/database'
import * as discord from '@/discord'
import * as stateManager from '@/discord/manager/state'

database.initialize()
discord.initialize()

const log = logger('App')

process.on('uncaughtException', (err: Error) => {
    log.error(err.stack)
    process.exit(1)
})

process.on('unhandledRejection', (err: Error) => {
    log.warn(err.stack)
})

process.on('SIGINT', stateManager.saveStates)
process.on('SIGTERM', stateManager.saveStates)
process.on('SIGHUP', stateManager.saveStates)
