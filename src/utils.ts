import 'moment/locale/ja'
import path from 'path'
import moment from 'moment'
import Chart from 'chart.js/auto'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { UserHistoryRecord } from '@/database'

export type RangeUnit = 'week' | 'month' | 'year'
export type TimeUnit = 'seconds' | 'minutes' | 'hours'

type Statistics = {
    today: number
    weekly: number
    monthly: number
    total: number
    longest: number
    longestTimeDate: number
    firstJoinDate: number
    vcJoinCount: number
    chartData: {
        rangeUnit: RangeUnit
        timeUnit: TimeUnit
        data: { [key: string]: number }
    } | null
}

export function calcurateStatistics(userHistorys: UserHistoryRecord[], rangeUnit?: RangeUnit) {
    const statistics: Statistics = {
        today: 0,
        weekly: 0,
        monthly: 0,
        total: 0,
        longest: 0,
        longestTimeDate: 0,
        firstJoinDate: Infinity,
        vcJoinCount: 0,
        chartData: rangeUnit ? {
            rangeUnit,
            timeUnit: 'seconds',
            data: {}
        } : null
    }

    const diffTarget = {
        today: moment().startOf('day').unix() * 1000,
        week: moment().startOf('day').subtract(7, 'days').unix() * 1000,
        month: moment().startOf('day').subtract(31, 'days').unix() * 1000,
        range: moment().startOf('day').subtract(getRangeDate(rangeUnit, true), 'days').add(1, 'day').unix() * 1000
    }

    // チャート用データの初期化
    if (statistics.chartData) {
        const count = rangeUnit === 'week' ? 7 : rangeUnit === 'month' ? 31 : 12
        for (let i = 0; i < count; i++) {
            statistics.chartData.data[moment().subtract(count - i - 1, rangeUnit === 'year' ? 'month' : 'days').format(rangeUnit === 'week' ? 'ddd' : rangeUnit === 'month' ? 'Do' : 'MMM')] = 0
        }
    }

    for (const record of userHistorys) {
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

        // チャート用データ
        if (statistics.chartData) {
            if (record.unix < diffTarget.range) continue
            const date = moment(record.unix).format(rangeUnit === 'week' ? 'ddd' : rangeUnit === 'month' ? 'Do' : 'MMM')
            statistics.chartData.data[date] += record.time
        }
    }

    // チャート用データの単位変換
    if (statistics.chartData) {
        const chart = statistics.chartData.data

        // 最大値をもとに適切な単位に変換する
        const max = Math.max(...Object.values(chart))
        const unit = max > 3600 ? 'hours' : max > 60 ? 'minutes' : 'seconds'
        statistics.chartData.timeUnit = unit

        // ミリ秒から単位変換
        for (const key in chart) {
            switch (unit) {
                case 'hours': {
                    chart[key] /= (3600 * 1000)
                    break
                }   
                case 'minutes': {
                    chart[key] /= (60 * 1000)
                    break
                }
                case 'seconds': {
                    chart[key] /= 1000
                    break
                }
            }

            chart[key] = Math.round(chart[key] * 100) / 100
        }
    }

    const result = {
        firstJoinDate: moment(statistics.firstJoinDate).format('YYYY/MM/DD'),
        today: getTime(statistics.today, true),
        weekly: getTime(statistics.weekly, false, true),
        monthly: getTime(statistics.monthly, false, true),
        total: getTime(statistics.total, false, true),
        longest: getTime(statistics.longest),
        longestTimeDate: moment(statistics.longestTimeDate).format('YYYY/MM/DD'),
        vcJoinCount: statistics.vcJoinCount,
        average: getTime(statistics.total / statistics.vcJoinCount),
        chartData: statistics.chartData,
    }

    return result
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

export function getRangeDate(rangeUnit: RangeUnit | undefined, rawUnit = false) {
    let unit

    switch (rangeUnit) {
        case 'week': {
            unit = 7
            break
        }
        case 'month': {
            unit = 31
            break
        }
        case 'year': {
            unit = 365
            break
        }
        default: {
            unit = 31
            break
        }
    }

    if (rawUnit) {
        return unit
    }

    return moment().startOf('day').subtract(unit, 'days').unix() * 1000
}

export function renderChart(chartData: NonNullable<Statistics['chartData']>) {
    const canvas = createCanvas(1280, 720)
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D

    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Mplus2-Medium.otf'), 'M PLUS 2')

    Chart.defaults.font.family = 'M PLUS 2'
    Chart.defaults.font.size = 16
    Chart.defaults.color = '#ECEFF4'

    Chart.register({
        id: 'bg',
        beforeDraw: (chart) => {
            const ctx = chart.ctx
            ctx.save()
            ctx.globalCompositeOperation = 'destination-over'
            ctx.fillStyle = '#2E3440'
            ctx.fillRect(0, 0, chart.width, chart.height)
            ctx.restore()
        }
    })

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(chartData.data),
            datasets: [{
                label: '参加時間',
                data: Object.values(chartData.data),
                borderWidth: 2.5,
                backgroundColor: 'rgba(163, 190, 140, 0.5)',
                borderColor: 'rgb(163, 190, 140)',
            }]
        },
        options: {
            animation: false,
            plugins: {
                title: {
                    display: true,
                    text: '通話参加時間',
                },
                legend: {
                    display: false
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: '#D8DEE9'
                    },
                    grid: {
                        color: '#434C5E'
                    },
                    title: {
                        display: true,
                        text: chartData.rangeUnit === 'week' ? '曜日' : chartData.rangeUnit === 'month' ? '日' : '月',
                        color: '#D8DEE9'
                    },
                },
                y: {
                    ticks: {
                        color: '#D8DEE9'
                    },
                    grid: {
                        color: '#434C5E'
                    },
                    title: {
                        display: true,
                        text: chartData.timeUnit === 'hours' ? '時間' : chartData.timeUnit === 'minutes' ? '分' : '秒',
                        color: '#D8DEE9'
                    },
                }
            },
            layout: {
                padding: 20
            }
        }
    })

    chart.render()
    return canvas.toBuffer('image/png')
}
