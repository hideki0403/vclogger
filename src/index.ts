// VC logger
import dotenv from 'dotenv'
import logger from '@/logger'
import * as database from '@/database'
import * as discord from '@/discord'

dotenv.config()
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