import moment from 'moment'
import { UserHistoryRecord } from '@/database'

export function calcurateStatistics(userHistorys: UserHistoryRecord[], serverId?: string) {
    const statistics = {
        today: 0,
        weekly: 0,
        monthly: 0,
        total: 0,
        longest: 0,
        longestTimeDate: 0,
        firstJoinDate: Infinity,
        vcJoinCount: 0
    }

    const diffTarget = {
        today: moment().startOf('day').unix() * 1000,
        week: moment().startOf('day').subtract(7, 'days').unix() * 1000,
        month: moment().startOf('day').subtract(31, 'days').unix() * 1000
    }

    for (const record of userHistorys) {
        if (serverId && serverId !== record.server) continue

        // VC参加回数
        statistics.vcJoinCount++

        // 総通話時間
        statistics.total += record.time

        // 今日の通話時間
        if (record.unix > diffTarget.today) {
            statistics.today += record.time
        }

        // 週間の通話時間
        if (record.unix > diffTarget.week) {
            statistics.weekly += record.time
        }

        // 月間の通話時間
        if (record.unix > diffTarget.month) {
            statistics.monthly += record.time
        }

        // 最長通話時間
        if (record.time > statistics.longest) {
            statistics.longest = record.time
            statistics.longestTimeDate = record.unix
        }

        // 最初に参加した日
        if (statistics.firstJoinDate > record.unix) {
            statistics.firstJoinDate = record.unix
        }
    }

    return {
        firstJoinDate: moment(statistics.firstJoinDate).format('YYYY/MM/DD'),
        today: getTime(statistics.today, true),
        weekly: getTime(statistics.weekly, false, true),
        monthly: getTime(statistics.monthly, false, true),
        total: getTime(statistics.total, false, true),
        longest: getTime(statistics.longest),
        longestTimeDate: moment(statistics.longestTimeDate).format('YYYY/MM/DD'),
        vcJoinCount: statistics.vcJoinCount
    }
}

export function getTime(millis: number, showSecs = false, containsDays = false) {
    var parsed = parseMilliseconds(millis)
    var text = `${(parsed.days * 24) + parsed.hours}時間 ${parsed.minutes}分`

    if (showSecs) text += ` ${parsed.seconds}秒`
    if (containsDays) text += ` (約${Math.round(parsed.days)}日)`

    return text
}

export function parseMilliseconds(milliseconds: number) {
    const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil

    return {
        days: roundTowardsZero(milliseconds / 86400000),
        hours: roundTowardsZero(milliseconds / 3600000) % 24,
        minutes: roundTowardsZero(milliseconds / 60000) % 60,
        seconds: roundTowardsZero(milliseconds / 1000) % 60
    }
}