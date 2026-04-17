export const POMADE_INVALID_LOGIN_MESSAGE = "Invalid login information"
export const POMADE_NETWORK_ERROR_MESSAGE = "Network error, please try again"

type PomadeMessage = {
  res?: unknown
}

export const getPomadeLoginFailureMessage = (messages: PomadeMessage[]) =>
  messages.some(message => message.res !== undefined)
    ? POMADE_INVALID_LOGIN_MESSAGE
    : POMADE_NETWORK_ERROR_MESSAGE
