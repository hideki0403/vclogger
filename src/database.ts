import sqlite3 from 'better-sqlite3'

export type UserHistoryRecord = {
    user: string
    server: string
    unix: number
    time: number
}

export const db = sqlite3('database.sqlite3')

export function initialize() {
    db.prepare('CREATE TABLE IF NOT EXISTS history(user TEXT, server TEXT, unix INTEGER, time INTEGER)').run()
}

export function insertHistory(user: string, server: string, unix: number, time: number) {
    db.prepare('INSERT INTO history VALUES (?, ?, ?, ?)').run(user, server, unix, time)
}

export function getUserHistory(user: string) {
    return db.prepare('SELECT * FROM history WHERE user = ?').all(user) as UserHistoryRecord[]
}
