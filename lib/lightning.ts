/**
 * Lightning Network service for interacting with LND node
 */

import { extractInvoiceAmount } from "./lightning-validation"

// Helper function to make authenticated requests to the LND REST API
export async function lndRequest(endpoint: string, method = "GET", body?: any) {
  const LND_REST_URL = process.env.LND_REST_URL
  const LND_ADMIN_MACAROON = process.env.LND_ADMIN_MACAROON

  if (!LND_REST_URL || !LND_ADMIN_MACAROON) {
    console.error("Lightning configuration missing")
    return { success: false, error: "Lightning configuration missing" }
  }

  try {
    // Ensure the URL is properly formatted with a protocol
    let baseUrl = LND_REST_URL
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`
    }

    // Remove trailing slash if present
    baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl

    const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

    console.log(`Making request to: ${url}`)

    const headers: HeadersInit = {
      "Grpc-Metadata-macaroon": LND_ADMIN_MACAROON,
      "Content-Type": "application/json",
    }

    const options: RequestInit = {
      method,
      headers,
      cache: "no-store",
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    // Check if the response is JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      console.error(`Non-JSON response (${response.status}):`, text.substring(0, 500))
      return {
        success: false,
        error: `Invalid response format: ${contentType || "unknown"}`,
        details: `Status: ${response.status}, Body: ${text.substring(0, 200)}...`,
      }
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`LND API error (${response.status}):`, errorData)
      return {
        success: false,
        error: `LND API error: ${response.status} ${response.statusText}`,
        details: errorData,
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error("Lightning request error:", error)
    return {
      success: false,
      error: "Failed to communicate with Lightning node",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

// Separate helper function for Voltage Payments API
async function voltageRequest(endpoint: string, method = "GET", body?: any) {
  const VOLTAGE_API_KEY = process.env.VOLTAGE_API_KEY
  const VOLTAGE_ORGANIZATION_ID = process.env.VOLTAGE_ORGANIZATION_ID
  const VOLTAGE_ENVIRONMENT_ID = process.env.VOLTAGE_ENVIRONMENT_ID

  if (!VOLTAGE_API_KEY || !VOLTAGE_ORGANIZATION_ID || !VOLTAGE_ENVIRONMENT_ID) {
    console.error("Voltage configuration missing")
    return { success: false, error: "Voltage configuration missing" }
  }

  try {
    const baseUrl = "https://api.voltage.cloud"
    const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

    console.log(`Making Voltage API request to: ${url}`)

    const headers: HeadersInit = {
      "Authorization": `Bearer ${VOLTAGE_API_KEY}`,
      "Content-Type": "application/json",
    }

    const options: RequestInit = {
      method,
      headers,
      cache: "no-store",
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    // Check if the response is JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      console.error(`Non-JSON response (${response.status}):`, text.substring(0, 500))
      return {
        success: false,
        error: `Invalid response format: ${contentType || "unknown"}`,
        details: `Status: ${response.status}, Body: ${text.substring(0, 200)}...`,
      }
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`Voltage API error (${response.status}):`, errorData)
      return {
        success: false,
        error: `Voltage API error: ${response.status} ${response.statusText}`,
        details: errorData,
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error("Voltage request error:", error)
    return {
      success: false,
      error: "Failed to communicate with Voltage API",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Create a Lightning invoice
 * @param value Amount in satoshis
 * @param memo Description for the invoice
 * @returns Invoice details including payment request
 */
export async function createInvoice(value: number, memo: string) {
  try {
    const result = await lndRequest("/v1/invoices", "POST", {
      value: value.toString(),
      memo,
      expiry: "3600", // 1 hour expiry
    })

    if (!result.success) {
      return result
    }

    return {
      success: true,
      paymentRequest: result.data.payment_request,
      rHash: result.data.r_hash_str || Buffer.from(result.data.r_hash, "base64").toString("hex"),
      addIndex: result.data.add_index,
    }
  } catch (error) {
    console.error("Create invoice error:", error)
    return {
      success: false,
      error: "Failed to create invoice",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check the status of an invoice
 * @param rHash The r_hash of the invoice to check
 * @returns Invoice status
 */
export async function checkInvoice(rHash: string) {
  try {
    // Convert hex string to base64 if needed
    let rHashParam = rHash
    if (!/^[a-zA-Z0-9+/=]+$/.test(rHash)) {
      // If not already base64, convert from hex to base64
      const buffer = Buffer.from(rHash, "hex")
      rHashParam = buffer.toString("base64")
    }

    const result = await lndRequest(`/v1/invoice/${encodeURIComponent(rHashParam)}`)

    if (!result.success) {
      return result
    }

    return {
      success: true,
      settled: result.data.settled,
      amountPaid: result.data.amt_paid_sat,
      state: result.data.state,
      creationDate: result.data.creation_date,
      settleDate: result.data.settle_date,
    }
  } catch (error) {
    console.error("Check invoice error:", error)
    return {
      success: false,
      error: "Failed to check invoice",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Pay a Lightning invoice
 * @param paymentRequest The BOLT11 payment request to pay
 * @param amount Optional amount in sats (for zero-amount invoices)
 * @returns Payment result
 */
export async function payInvoice(paymentRequest: string, amount?: number) {
  try {
    // Try to extract amount from the invoice
    const invoiceAmount = extractInvoiceAmount(paymentRequest)
    console.log("[payInvoice] Extracted invoice amount:", invoiceAmount)
    console.log("[payInvoice] Provided amount:", amount)

    // Build LND API request body for SendPaymentSync
    const body: any = { payment_request: paymentRequest }
    if ((invoiceAmount === null || invoiceAmount === 0) && amount) {
      body.amt = amount // LND expects 'amt' in satoshis
    }
    console.log("[payInvoice] Body sent to LND API:", JSON.stringify(body, null, 2))

    const result = await lndRequest("/v1/channels/transactions", "POST", body)
    console.log("[payInvoice] LND API response:", JSON.stringify(result, null, 2))
    
    if (result.success && result.data) {
      // Check if there's a payment error
      if (result.data.payment_error) {
        console.log("[payInvoice] Payment failed with error:", result.data.payment_error)
        return {
          success: false,
          error: `Payment failed: ${result.data.payment_error}`,
          details: result.data
        }
      }
      
      // Extract payment hash from the LND response
      const paymentHash = result.data.payment_hash
      console.log("[payInvoice] Payment successful, extracted payment hash:", paymentHash)
      return {
        success: true,
        paymentHash,
        data: result.data
      }
    }
    
    console.log("[payInvoice] Payment failed, returning error result")
    return result
  } catch (error) {
    throw error
  }
}

/**
 * Get node information
 * @returns Node info including public key and alias
 */
export async function getNodeInfo() {
  try {
    const result = await lndRequest("/v1/getinfo")

    if (!result.success) {
      return result
    }

    return {
      success: true,
      pubkey: result.data.identity_pubkey,
      alias: result.data.alias,
      version: result.data.version,
      syncedToChain: result.data.synced_to_chain,
      blockHeight: result.data.block_height,
    }
  } catch (error) {
    console.error("Get node info error:", error)
    return {
      success: false,
      error: "Failed to get node info",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}
