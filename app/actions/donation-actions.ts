"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { createInvoice } from "@/lib/lightning"

interface CreateDonationInvoiceParams {
  amount: number
  locationType: string
  locationName: string
  donorName?: string
  message?: string
}

export async function createDonationInvoice({
  amount,
  locationType,
  locationName,
  donorName,
  message,
}: CreateDonationInvoiceParams) {
  try {
    const adminSupabase = createServerSupabaseClient({
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    // Find or create donation pool
    let { data: pool } = await adminSupabase
      .from("donation_pools")
      .select("*")
      .eq("location_type", locationType)
      .eq("location_name", locationName)
      .single()

    if (!pool) {
      // Create new donation pool
      const { data: newPool, error: poolError } = await adminSupabase
        .from("donation_pools")
        .insert({
          location_type: locationType,
          location_name: locationName,
          boost_percentage: 10, // Default
        })
        .select()
        .single()

      if (poolError) {
        return { success: false, error: "Failed to create donation pool" }
      }
      pool = newPool
    }

    // Create Lightning invoice
    const memo = `Donation to ${locationName} (${amount} sats)`
    const invoiceResult = await createInvoice(amount, memo)

    if (!invoiceResult.success) {
      return { success: false, error: "Failed to create Lightning invoice" }
    }

    // Store donation record
    const { error: donationError } = await adminSupabase.from("donations").insert({
      donation_pool_id: pool.id,
      amount,
      payment_request: invoiceResult.paymentRequest,
      payment_hash: invoiceResult.rHash,
      status: "pending",
      donor_name: donorName,
      message,
    })

    if (donationError) {
      return { success: false, error: "Failed to store donation record" }
    }

    return {
      success: true,
      paymentRequest: invoiceResult.paymentRequest,
      poolId: pool.id,
    }
  } catch (error) {
    console.error("Error creating donation invoice:", error)
    return { success: false, error: "Unexpected error occurred" }
  }
}

export async function checkDonationStatus(paymentHash: string) {
  try {
    const adminSupabase = createServerSupabaseClient({
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    // Check if donation is completed
    const { data: donation } = await adminSupabase
      .from("donations")
      .select("*, donation_pools(*)")
      .eq("payment_hash", paymentHash)
      .eq("status", "pending")
      .single()

    if (!donation) {
      return { success: false, error: "Donation not found" }
    }

    // Here you would check the Lightning invoice status
    // For now, we'll assume it's a manual process

    return { success: true, donation }
  } catch (error) {
    console.error("Error checking donation status:", error)
    return { success: false, error: "Unexpected error occurred" }
  }
}
