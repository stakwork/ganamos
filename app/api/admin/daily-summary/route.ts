import { NextRequest, NextResponse } from "next/server"
import { sendDailySummaryEmail } from "../../../../lib/daily-summary"

/**
 * Send daily summary email
 * Can be triggered manually or by cron job
 */
export async function POST(request: NextRequest) {
  try {

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
