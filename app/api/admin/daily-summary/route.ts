import { NextRequest, NextResponse } from "next/server"
import { sendDailySummaryEmail } from "../../../../lib/daily-summary"

/**
 * Send daily summary email
 * Can be triggered manually or by Vercel Cron
 */

// Shared handler for both GET and POST (Vercel Cron uses GET)
async function handleDailySummary(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron or has valid authorization
    const authHeader = request.headers.get('authorization')
    
    // Vercel Cron sends a special header that we can verify
    // See: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('Triggering daily summary email...')
    const result = await sendDailySummaryEmail('brianmurray03@gmail.com')

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Daily summary email sent successfully',
        messageId: result.messageId
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Daily summary API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Vercel Cron uses GET requests
export async function GET(request: NextRequest) {
  return handleDailySummary(request)
}

// Support POST for manual triggering
export async function POST(request: NextRequest) {
  return handleDailySummary(request)
}
