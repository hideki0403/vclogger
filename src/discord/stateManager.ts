export type UserState = {
    joinTime: number,
    serverId: string,
}

export type ServerState = {
    globalStartTime: number,
    channels: Map<string, ChannelState>,
}

export type ChannelState = {
    startTime: number,
}

export const userStates = new Map<string, UserState>()
export const serverStates = new Map<string, ServerState>()