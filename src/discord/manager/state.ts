export type UserState = {
    joinTime: number,
    serverId: string,
    channelId: string,
}

export type ServerState = {
    globalStartTime: number,
    channels: Map<string, number>,
}

export const userStates = new Map<string, UserState>()
export const serverStates = new Map<string, ServerState>()