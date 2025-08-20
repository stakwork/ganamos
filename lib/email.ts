import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(to: string, subject: string, html: string) {
  console.log('[EMAIL DEBUG] Starting sendEmail function')
  console.log('[EMAIL DEBUG] To:', to)
  console.log('[EMAIL DEBUG] Subject:', subject)
  console.log('[EMAIL DEBUG] HTML length:', html.length)
  console.log('[EMAIL DEBUG] RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
  console.log('[EMAIL DEBUG] RESEND_API_KEY first 10 chars:', process.env.RESEND_API_KEY?.substring(0, 10))
  
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[EMAIL DEBUG] RESEND_API_KEY not configured')
      throw new Error('RESEND_API_KEY not configured')
    }

    console.log('[EMAIL DEBUG] About to call resend.emails.send')
    const { data, error } = await resend.emails.send({
      from: 'Ganamos <noreply@ganamos.earth>',
      to: [to],
      subject,
      html
    })

    console.log('[EMAIL DEBUG] Resend response - data:', data)
    console.log('[EMAIL DEBUG] Resend response - error:', error)

    if (error) {
      console.error('[EMAIL DEBUG] Resend error details:', JSON.stringify(error, null, 2))
      return { success: false, error: error.message }
    }

    console.log('[EMAIL DEBUG] Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('[EMAIL DEBUG] Exception caught:', error)
    console.error('[EMAIL DEBUG] Exception type:', typeof error)
    console.error('[EMAIL DEBUG] Exception stack:', error instanceof Error ? error.stack : 'No stack')
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
