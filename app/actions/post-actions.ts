"use server"

import { createInvoice } from "@/lib/lightning"
import { v4 as uuidv4 } from "uuid"

// We might need Supabase client for temporary invoice storage later, but not for initial invoice creation.
// import { createServerSupabaseClient } from "@/lib/supabase"
// async function getCookieStore() {
//   const { cookies } = await import("next/headers")
//   return cookies()
// }

/**
 * Creates a Lightning invoice for funding an anonymous post.
 * This invoice is intended to be paid by the anonymous user *before* the post is created.
 */
export async function createPostFundingInvoiceAction(amount: number): Promise<{
  success: boolean
  paymentRequest?: string
  rHash?: string
  error?: string
  details?: any
}> {
  if (amount <= 0) {
    return { success: false, error: "Amount must be greater than 0." }
  }

  // Basic check for Lightning configuration (similar to createDepositInvoice)
  const LND_REST_URL = process.env.LND_REST_URL
  const LND_ADMIN_MACAROON = process.env.LND_ADMIN_MACAROON

  if (!LND_REST_URL || !LND_ADMIN_MACAROON) {
    console.error("Lightning configuration missing in createPostFundingInvoiceAction")
    return {
      success: false,
      error: "Lightning configuration missing. Cannot create funding invoice.",
    }
  }
  try {
    new URL(LND_REST_URL.startsWith("http") ? LND_REST_URL : `https://${LND_REST_URL}`)
  } catch (e) {
    return { success: false, error: "Invalid Lightning URL format." }
  }
  if (!/^[0-9a-fA-F]+$/.test(LND_ADMIN_MACAROON)) {
    return { success: false, error: "Invalid macaroon format." }
  }

  const memo = `Fund anonymous post on Ganamos! (${amount} sats)`

  try {
    const invoiceResult = await createInvoice(amount, memo)

    if (!invoiceResult.success || !invoiceResult.paymentRequest || !invoiceResult.rHash) {
      console.error(
        "Failed to create funding invoice via Lightning library:",
        invoiceResult.error,
        invoiceResult.details,
      )
      return {
        success: false,
        error: "Failed to create funding invoice.",
        details: invoiceResult.error || invoiceResult.details,
      }
    }

    // Convert rHash to hex string if it's a Buffer
    let rHashStr = invoiceResult.rHash
    if (typeof rHashStr === "object" && rHashStr !== null && Buffer.isBuffer(rHashStr)) {
      rHashStr = rHashStr.toString("hex")
    }

    console.log(`Funding invoice created for anonymous post: ${amount} sats, rHash: ${rHashStr}`)

    // At this point, we are NOT saving to the 'posts' table yet.
    // We return the invoice details to the client.
    // The client will then wait for payment.
    // Once payment is confirmed, the client will call another action to create the post.

    return {
      success: true,
      paymentRequest: invoiceResult.paymentRequest,
      rHash: rHashStr as string,
    }
  } catch (error) {
    console.error("Unexpected error in createPostFundingInvoiceAction:", error)
    return {
      success: false,
      error: "An unexpected error occurred while creating the funding invoice.",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Checks the status of a funding invoice for an anonymous post.
 * (To be implemented more fully later - this is a placeholder)
 */
export async function checkPostFundingStatusAction(rHash: string): Promise<{
  success: boolean
  settled: boolean
  error?: string
}> {
  // Placeholder: In a real scenario, this would call `checkInvoice(rHash)`
  // from `lib/lightning.ts` and potentially update a temporary record.
  console.log(`Checking funding status for rHash (placeholder): ${rHash}`)
  // Simulate a 50/50 chance of being settled for testing
  // const isSettled = Math.random() < 0.5;
  // return { success: true, settled: isSettled };

  // For now, let's assume it's not settled until we implement polling properly
  return { success: true, settled: false }
}

/**
 * Creates the actual post in the database AFTER an anonymous user has funded it.
 * (To be implemented more fully later)
 */
export async function createFundedAnonymousPostAction(postDetails: {
  description: string
  reward: number
  image: string | null // Assuming image is a URL or base64 string
  locationName: string | null
  latitude: number | null
  longitude: number | null
  city: string | null
  fundingRHash: string // The r_hash of the paid funding invoice
}): Promise<{ success: boolean; postId?: string; error?: string }> {
  console.log("Placeholder for createFundedAnonymousPostAction", postDetails)
  // 1. Verify fundingRHash again, or ensure it's from a trusted source (e.g. session after payment)
  // 2. Insert into Supabase 'posts' table with is_anonymous = true, funding_r_hash, funding_status = 'paid'
  // const supabase = createServerSupabaseClient(); // Or service role if needed
  // const postId = uuidv4();
  // const { data, error } = await supabase.from("posts").insert({ ...postDetails, id: postId, is_anonymous: true, funding_status: 'paid' ... }).select().single();
  // if (error) return { success: false, error: error.message };
  // return { success: true, postId: data.id };
  return { success: true, postId: uuidv4() } // Placeholder
}
