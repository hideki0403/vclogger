import sqlite3 from 'better-sqlite3'

export type UserHistoryRecord = {
    user: string,
    server: string,
    channel: string,
    unix: number,
    time: number,
}

export type SearchOptions = {
    user?: string,
    server?: string,
    channel?: string,
    before?: number,
    after?: number,
}

const overrideConditions = {
    before: {
        column: 'unix',
        condition: '<=',
    },
    after: {
        column: 'unix',
        condition: '>=',
    },
} as Record<string, Record<string, string> | undefined>

export const db = sqlite3('database.sqlite3')

export function initialize() {
    db.prepare('CREATE TABLE IF NOT EXISTS history(user TEXT, server TEXT, channel TEXT, unix INTEGER, time INTEGER)').run()
}

export function insertHistory(user: string, server: string, channel: string, unix: number, time: number) {
    db.prepare('INSERT INTO history VALUES (?, ?, ?, ?, ?)').run(user, server, channel, unix, time)
}

export function getHistory(options?: SearchOptions) {
    const query = []
    const params = []

    if (options) {
        for (const [key, value] of Object.entries(options)) {
            if (key === undefined || value === undefined) continue

            const cond = overrideConditions[key]
            query.push(`${cond?.column ?? key} ${cond?.condition ?? '='} ?`)
            params.push(value)
        }
    }

    let sql = 'SELECT * FROM history'
    if (query.length) sql += ` WHERE ${query.join(' AND ')}`

    return db.prepare(sql).all(...params) as UserHistoryRecord[]
}
