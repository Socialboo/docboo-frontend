/**
 * Authentication state exposed to the router context.
 *
 * MVP: there is no login yet. The backend acts as a single configured local user
 * (LocalCurrentUser), so the frontend is always authenticated. When real login
 * arrives, replace `localAuth` with a provider backed by the session/token and the
 * `_private` route guard keeps working unchanged.
 */
export interface AuthState {
  isAuthenticated: boolean
  /** Display name of the signed-in user, when known. */
  userName: string | null
}

export const localAuth: AuthState = {
  isAuthenticated: true,
  userName: null,
}
