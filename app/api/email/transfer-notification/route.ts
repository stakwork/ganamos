import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { sendBitcoinSentEmail, sendBitcoinReceivedEmail } from "@/lib/transaction-emails"

/**
 * Send email notifications for internal Bitcoin transfers
 * This is called after a successful internal transfer
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fromUserId, toUserId, amount, date } = body

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      )
    }

    // Use service role key for admin access to bypass RLS
    const adminSupabase = createServerSupabaseClient({
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    // Get sender and receiver profiles
    const { data: senderProfile } = await adminSupabase
      .from("profiles")
      .select("email, name")
      .eq("id", fromUserId)
      .single()

    const { data: receiverProfile } = await adminSupabase
      .from("profiles")
      .select("email, name")
      .eq("id", toUserId)
      .single()

    const transferDate = date ? new Date(date) : new Date()

    // Send email to sender (only if they have a verified email)
    if (senderProfile?.email && !senderProfile.email.includes('@ganamos.app')) {
      sendBitcoinSentEmail({
        toEmail: senderProfile.email,
        userName: senderProfile.name || "User",
        amountSats: amount,
        toName: receiverProfile?.name,
        date: transferDate,
        transactionType: 'internal'
      }).catch(error => {
        console.error("Error sending Bitcoin sent email:", error)
      })
    }

    // Send email to receiver (only if they have a verified email)
    if (receiverProfile?.email && !receiverProfile.email.includes('@ganamos.app')) {
      sendBitcoinReceivedEmail({
        toEmail: receiverProfile.email,
        userName: receiverProfile.name || "User",
        amountSats: amount,
        fromName: senderProfile?.name,
        date: transferDate,
        transactionType: 'internal'
      }).catch(error => {
        console.error("Error sending Bitcoin received email:", error)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending transfer notification emails:", error)
    return NextResponse.json(
      { success: false, error: "Failed to send email notifications" },
      { status: 500 }
    )
  }
}

