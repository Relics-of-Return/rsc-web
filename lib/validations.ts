/** Username rules enforced by the data server (also validated client-side). */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{1,12}$/
export const USERNAME_MESSAGE =
  'Usernames must be 1-12 letters, numbers or underscores.'

/** Password length rules enforced by the data server. */
export const PASSWORD_MIN = 4
export const PASSWORD_MAX = 20
export const PASSWORD_MESSAGE = `Passwords must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters long.`

/**
 * Register result codes returned by the data server via rsc-www
 * (see rsc-www's REGISTER_MESSAGES).
 */
export const REGISTER_MESSAGES: Record<number, string> = {
  0: 'Your account has been created successfully! You may now log in.',
  3: 'That username is already taken.',
  6: 'There is already a character logged in from your address.',
  7: 'You must wait 5 minutes between creating accounts.',
  9: 'The website is not yet connected to the game server. Please try again later.',
}
