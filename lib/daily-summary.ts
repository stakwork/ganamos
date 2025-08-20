import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'
import { sendEmail } from './email'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DailySummaryData {
  nodeBalance: {
    channel_balance: number
    pending_balance: number
    onchain_balance: number
    total_balance: number
  }
  appTotalBalance: number
  last24Hours: {
    transactions: {
      count: number
    }
    deposits: {
      count: number
      amount: number
    }
    withdrawals: {
      count: number
      amount: number
    }
    rewards: {
      count: number
      amount: number
    }
    earnings: {
      count: number
      amount: number
    }
    activeUsers: number
  }
}

export async function getDailySummaryData(): Promise<DailySummaryData> {
  console.log('[DATA DEBUG] Starting getDailySummaryData function')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayIso = yesterday.toISOString()
  console.log('[DATA DEBUG] Yesterday ISO:', yesterdayIso)

  // Get node balance
  // In production, use the production domain; in development, use localhost
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 (process.env.NODE_ENV === 'production' ? 'https://www.ganamos.earth' : 'http://localhost:3457')
  console.log('[DATA DEBUG] App URL:', appUrl)
  console.log('[DATA DEBUG] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
  console.log('[DATA DEBUG] VERCEL_URL:', process.env.VERCEL_URL)
  console.log('[DATA DEBUG] About to fetch node balance from:', `${appUrl}/api/admin/node-balance`)
  
  let nodeBalanceData
  try {
    const nodeBalanceResponse = await fetch(`${appUrl}/api/admin/node-balance`)
    console.log('[DATA DEBUG] Node balance response status:', nodeBalanceResponse.status)
    console.log('[DATA DEBUG] Node balance response ok:', nodeBalanceResponse.ok)
    
    nodeBalanceData = nodeBalanceResponse.ok 
      ? await nodeBalanceResponse.json()
      : { balances: { channel_balance: 0, pending_balance: 0, onchain_balance: 0, total_balance: 0 } }
    
    console.log('[DATA DEBUG] Node balance data:', JSON.stringify(nodeBalanceData, null, 2))
  } catch (fetchError) {
    console.error('[DATA DEBUG] Error fetching node balance:', fetchError)
    nodeBalanceData = { balances: { channel_balance: 0, pending_balance: 0, onchain_balance: 0, total_balance: 0 } }
  }

  // Get app total balance (sum of all user balances)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('balance')
    
  const appTotalBalance = profiles?.reduce((sum, profile) => sum + profile.balance, 0) || 0

  // Get transactions in last 24 hours
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, status')
    .gte('created_at', yesterdayIso)
    .eq('status', 'completed')

  const transactionsCount = transactions?.length || 0
  const deposits = transactions?.filter(t => t.type === 'deposit') || []
  const withdrawals = transactions?.filter(t => t.type === 'withdrawal') || []

  // Get posts created in last 24 hours (rewards)
  const { data: createdPosts } = await supabase
    .from('posts')
    .select('reward')
    .gte('created_at', yesterdayIso)

  const rewardsCount = createdPosts?.length || 0
  const rewardsAmount = createdPosts?.reduce((sum, post) => sum + post.reward, 0) || 0

  // Get posts completed in last 24 hours (earnings)
  const { data: completedPosts } = await supabase
    .from('posts')
    .select('reward')
    .gte('fixed_at', yesterdayIso)
    .eq('fixed', true)

  const earningsCount = completedPosts?.length || 0
  const earningsAmount = completedPosts?.reduce((sum, post) => sum + post.reward, 0) || 0

  // Get active users (users who had any transaction, created post, or fixed post in last 24 hours)
  const { data: activeUserIds } = await supabase
    .rpc('get_active_users_last_24h', { since_timestamp: yesterdayIso })

  const activeUsers = activeUserIds?.length || 0

  return {
    nodeBalance: nodeBalanceData.balances,
    appTotalBalance,
    last24Hours: {
      transactions: {
        count: transactionsCount
      },
      deposits: {
        count: deposits.length,
        amount: deposits.reduce((sum, d) => sum + d.amount, 0)
      },
      withdrawals: {
        count: withdrawals.length,
        amount: withdrawals.reduce((sum, w) => sum + w.amount, 0)
      },
      rewards: {
        count: rewardsCount,
        amount: rewardsAmount
      },
      earnings: {
        count: earningsCount,
        amount: earningsAmount
      },
      activeUsers
    }
  }
}

export function generateEmailHTML(data: DailySummaryData): string {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return `
    <h2>Ganamos Daily Summary - ${date}</h2>
    
    <h3>Node & App Balances</h3>
    <ul>
      <li><strong>Node Balance:</strong> ${data.nodeBalance.total_balance.toLocaleString()} sats</li>
      <li><strong>App Total Balance:</strong> ${data.appTotalBalance.toLocaleString()} sats</li>
      <li><strong>Difference (Audit):</strong> ${(data.nodeBalance.total_balance - data.appTotalBalance).toLocaleString()} sats</li>
    </ul>

    <h3>Last 24 Hours Activity</h3>
    
    <h4>Transactions</h4>
    <ul>
      <li><strong>Total Transactions:</strong> ${data.last24Hours.transactions.count}</li>
      <li><strong>Deposits:</strong> ${data.last24Hours.deposits.count} (${data.last24Hours.deposits.amount.toLocaleString()} sats)</li>
      <li><strong>Withdrawals:</strong> ${data.last24Hours.withdrawals.count} (${data.last24Hours.withdrawals.amount.toLocaleString()} sats)</li>
    </ul>

    <h4>Posts & Rewards</h4>
    <ul>
      <li><strong>New Posts Created:</strong> ${data.last24Hours.rewards.count} (${data.last24Hours.rewards.amount.toLocaleString()} sats in rewards)</li>
      <li><strong>Posts Completed:</strong> ${data.last24Hours.earnings.count} (${data.last24Hours.earnings.amount.toLocaleString()} sats earned)</li>
    </ul>

    <h4>User Activity</h4>
    <ul>
      <li><strong>Active Users:</strong> ${data.last24Hours.activeUsers}</li>
    </ul>

    <hr>
    <p><small>Generated at ${new Date().toLocaleString()}</small></p>
  `
}

export async function sendDailySummaryEmail(toEmail: string = 'brianmurray03@gmail.com') {
  console.log('[DAILY SUMMARY DEBUG] Starting sendDailySummaryEmail function')
  console.log('[DAILY SUMMARY DEBUG] toEmail:', toEmail)
  
  try {
    console.log('[DAILY SUMMARY DEBUG] Generating daily summary data...')
    const data = await getDailySummaryData()
    console.log('[DAILY SUMMARY DEBUG] Data generated successfully:', JSON.stringify(data, null, 2))
    
    console.log('[DAILY SUMMARY DEBUG] Generating email content...')
    const emailHTML = generateEmailHTML(data)
    console.log('[DAILY SUMMARY DEBUG] Email HTML generated, length:', emailHTML.length)
    
    console.log('[DAILY SUMMARY DEBUG] About to call sendEmail...')
    const result = await sendEmail(
      toEmail,
      `Ganamos Daily Summary - ${new Date().toLocaleDateString()}`,
      emailHTML
    )
    console.log('[DAILY SUMMARY DEBUG] sendEmail result:', JSON.stringify(result, null, 2))

    if (result.success) {
      console.log('[DAILY SUMMARY DEBUG] Daily summary email sent successfully')
      return { success: true, messageId: result.messageId }
    } else {
      console.error('[DAILY SUMMARY DEBUG] Failed to send daily summary email:', result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error('[DAILY SUMMARY DEBUG] Exception in sendDailySummaryEmail:', error)
    console.error('[DAILY SUMMARY DEBUG] Exception stack:', error instanceof Error ? error.stack : 'No stack')
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
