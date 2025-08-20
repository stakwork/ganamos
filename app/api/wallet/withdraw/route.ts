import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createServerSupabaseClient } from "@/lib/supabase"
import { payInvoice } from "@/lib/lightning"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    // Use the official Supabase Next.js helper for session extraction
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    // Debug: log session
    console.log("[Withdraw API] session:", session, sessionError)

    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }
    const userId = session.user.id

    // Parse body
    const body = await request.json()
    const paymentRequest = body.paymentRequest as string
    const amount = Number.parseInt(body.amount as string, 10)

    if (!paymentRequest || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid payment request or amount" }, { status: 400 })
    }

    // Use service role key for admin access to bypass RLS
    const adminSupabase = createServerSupabaseClient({
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    // Check if the user has enough balance
    const { data: profile } = await adminSupabase.from("profiles").select("balance").eq("id", userId).single()
    if (!profile) {
      return NextResponse.json({ success: false, error: "User profile not found" }, { status: 404 })
    }
    if (profile.balance < amount) {
      return NextResponse.json({ success: false, error: "Insufficient balance" }, { status: 400 })
    }

    // Create a transaction record
    const { data: transaction, error: txError } = await adminSupabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "withdrawal",
        amount,
        status: "pending",
        payment_request: paymentRequest,
        memo: `Withdrawal of ${amount} sats from Ganamos!`,
      })
      .select()
      .single()
    if (txError || !transaction) {
      console.error("Error creating transaction:", txError)
      return NextResponse.json({ success: false, error: "Failed to create transaction" }, { status: 500 })
    }

    // Pay the invoice
    console.log("[Withdraw API] About to pay invoice:", paymentRequest, "amount:", amount)
    const paymentResult = await payInvoice(paymentRequest, amount)
    console.log("[Withdraw API] Payment result:", JSON.stringify(paymentResult, null, 2))
    
    if (!paymentResult.success) {
      console.log("[Withdraw API] Payment failed, updating transaction to failed")
      // Update transaction to failed
      await adminSupabase
        .from("transactions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to pay invoice",
        details: paymentResult.error,
        debugInfo: paymentResult.details
      }, { status: 500 })
    }

    // Update transaction with payment hash and status
    await adminSupabase
      .from("transactions")
      .update({
        status: "completed",
        payment_hash: paymentResult.paymentHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)

    // Update user balance
    const newBalance = profile.balance - amount
    await adminSupabase
      .from("profiles")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    // Revalidate the profile page to show updated balance
    revalidatePath("/profile")
    revalidatePath("/dashboard")
    revalidatePath("/wallet")

    // Add activity for withdrawal
    await adminSupabase.from("activities").insert({
      id: uuidv4(),
      user_id: userId,
      type: "withdrawal",
      related_id: transaction.id,
      related_table: "transactions",
      timestamp: new Date().toISOString(),
      metadata: { amount, status: "completed" },
    })

    return NextResponse.json({
      success: true,
      paymentHash: paymentResult.paymentHash,
      newBalance,
      amount: amount, // Include withdrawal amount for confirmation
    })
  } catch (error) {
    console.error("Unexpected error in withdraw API:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
} 