let tokenProvider: () => Promise<string | undefined> = async () => undefined

export function setApiTokenProvider(provider: typeof tokenProvider) { tokenProvider = provider }

export async function apiIdentity(userId: string | undefined) {
  const token = userId ? await tokenProvider() : undefined
  return { token, demoUserId: !token && userId && import.meta.env.DEV ? userId : undefined }
}
