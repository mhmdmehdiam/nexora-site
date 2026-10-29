import { NextResponse } from 'next/server'

/**
 * Tells the login/register UI whether Google sign-in is configured so the
 * button can be shown or hidden. No secrets are exposed — only a boolean.
 */
export async function GET() {
  const enabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )
  return NextResponse.json({ enabled })
}
