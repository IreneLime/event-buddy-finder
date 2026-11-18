declare global {
  namespace Express {
    interface Request {
      userId?: string
      userEmail?: string | null
      emailVerified?: boolean
    }
  }
}

export {}
