"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'

// State management
let bitcoinPrice: number | null = null
let isPriceLoading = true
const API_FEE = 10 // Fixed API fee in sats
let reward = 2000 // Job reward in sats (matches main app default)
let selectedLocation: { name: string; lat: number; lng: number } | null = null

// Constants
const MIN_REWARD = 0
const REWARD_INCREMENT = 500 // Same as main app
const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : ''

export default function NewJobPage() {
  const [rewardAmount, setRewardAmount] = useState(2000)
  const [currentInvoice, setCurrentInvoice] = useState<string | null>(null)
  const [currentMacaroon, setCurrentMacaroon] = useState<string | null>(null)
  const [paymentCheckInterval, setPaymentCheckInterval] = useState<NodeJS.Timeout | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [bitcoinPriceState, setBitcoinPriceState] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLocationState, setSelectedLocationState] = useState<{ name: string; lat: number; lng: number } | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<any>(null)

  // Fetch Bitcoin price on mount
  useEffect(() => {
    fetchBitcoinPrice()
  }, [])

  // Fetch Bitcoin price
  const fetchBitcoinPrice = async () => {
    try {
      const response = await fetch('/api/bitcoin-price')
      if (response.ok) {
        const data = await response.json()
        if (data.price && typeof data.price === 'number') {
          setBitcoinPriceState(data.price)
          bitcoinPrice = data.price
        }
      }
    } catch (error) {
      console.warn('Failed to fetch Bitcoin price:', error)
    } finally {
      isPriceLoading = false
    }
  }

  // Calculate USD value
  const calculateUsdValue = (sats: number) => {
    if (!bitcoinPriceState) return null
    const btcAmount = sats / 100000000
    const usdValue = btcAmount * bitcoinPriceState
    return usdValue.toFixed(2)
  }

  // Handle reward adjustment
  const adjustReward = (delta: number) => {
    setRewardAmount(prev => Math.max(MIN_REWARD, prev + delta))
  }

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Remove image
  const removeImage = () => {
    setImagePreview(null)
    const input = document.getElementById('image') as HTMLInputElement
    if (input) input.value = ''
  }

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
      reader.readAsDataURL(file)
    })
  }

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const jobData: any = {
      title: formData.get('title'),
      description: formData.get('description'),
      location: formData.get('location') || null,
      latitude: selectedLocationState?.lat || null,
      longitude: selectedLocationState?.lng || null,
      reward: rewardAmount
    }

    // Handle image upload
    const imageFile = formData.get('image') as File
    if (imageFile && imageFile.size > 0) {
      try {
        const base64Image = await fileToBase64(imageFile)
        jobData.image_url = base64Image
      } catch (error) {
        console.error('Error converting image:', error)
        jobData.image_url = null
      }
    } else {
      jobData.image_url = null
    }

    try {
      await createJobPosting(jobData)
    } catch (error) {
      console.error('Error creating job posting:', error)
      alert('Error creating job posting: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  // Create job posting with L402 flow
  const createJobPosting = async (jobData: any) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      })

      if (response.status === 402) {
        // Handle 402 Payment Required
        const paymentData = await response.json()
        const authHeader = response.headers.get('WWW-Authenticate')
        
        if (!authHeader) {
          throw new Error('No WWW-Authenticate header in 402 response')
        }

        // Parse the L402 challenge
        const challenge = parseL402Challenge(authHeader)
        setCurrentInvoice(challenge.invoice)
        setCurrentMacaroon(challenge.macaroon)

        // Show payment modal
        setShowPaymentModal(true)
        
        // Start checking for payment
        startPaymentCheck(jobData, paymentData.total_amount)
        
      } else if (response.ok) {
        const result = await response.json()
        showSuccess(result.post_id, result)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create job posting')
      }
    } catch (error) {
      console.error('Error in createJobPosting:', error)
      throw error
    }
  }

  // Parse L402 challenge from WWW-Authenticate header
  const parseL402Challenge = (authHeader: string) => {
    const macaroonMatch = authHeader.match(/macaroon="([^"]+)"/)
    const invoiceMatch = authHeader.match(/invoice="([^"]+)"/)
    
    if (!macaroonMatch || !invoiceMatch) {
      throw new Error('Invalid L402 challenge format')
    }

    return {
      macaroon: macaroonMatch[1],
      invoice: invoiceMatch[1]
    }
  }

  // Start checking for payment completion
  const startPaymentCheck = (jobData: any, totalAmount: number) => {
    const checkInterval = setInterval(async () => {
      try {
        await checkPaymentStatus(jobData)
      } catch (error) {
        console.error('Payment check error:', error)
      }
    }, 2000)
    
    setPaymentCheckInterval(checkInterval)
    
    // Stop checking after 10 minutes
    setTimeout(() => {
      if (checkInterval) {
        clearInterval(checkInterval)
        setPaymentCheckInterval(null)
      }
    }, 600000)
  }

  // Check if payment has been made
  const checkPaymentStatus = async (jobData: any) => {
    if (!currentMacaroon || !currentInvoice) {
      return
    }

    try {
      const macaroonData = JSON.parse(atob(currentMacaroon))
      const paymentHash = macaroonData.identifier
      
      const statusResponse = await fetch(`/api/invoice-status?r_hash=${paymentHash}`)
      
      if (!statusResponse.ok) {
        return
      }
      
      const statusData = await statusResponse.json()
      
      if (statusData.success && statusData.settled) {
        // Stop checking
        if (paymentCheckInterval) {
          clearInterval(paymentCheckInterval)
          setPaymentCheckInterval(null)
        }
        
        if (statusData.preimage) {
          // Complete job creation with real L402 token
          await completeJobCreationWithPreimage(jobData, statusData.preimage)
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    }
  }

  // Complete job creation with real preimage
  const completeJobCreationWithPreimage = async (jobData: any, preimage: string) => {
    if (!currentMacaroon) {
      throw new Error('Missing L402 macaroon')
    }

    try {
      const l402Token = `${currentMacaroon}:${preimage}`
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `L402 ${l402Token}`
        },
        body: JSON.stringify(jobData)
      })

      if (response.ok) {
        const result = await response.json()
        setShowPaymentModal(false)
        showSuccess(result.post_id, result)
      } else {
        const error = await response.json()
        console.error('Failed to create job:', error)
      }
    } catch (error) {
      console.error('Error completing job creation with preimage:', error)
    }
  }

  // Show success modal
  const showSuccess = (postId: string, result: any) => {
    setSuccessData({ postId, ...result })
    setShowSuccessModal(true)
  }

  const totalCost = rewardAmount + API_FEE
  const totalUsd = calculateUsdValue(totalCost)

  return (
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/community-fixing.jpg"
          alt="Community background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        <div className="bg-white/90 backdrop-blur rounded-lg shadow-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Post a Job on Ganamos</h1>
          </div>

          {/* Job Creation Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div>
              {!imagePreview ? (
                <div className="relative">
                  <input 
                    type="file" 
                    id="image" 
                    name="image"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md text-center hover:border-green-400 transition-colors cursor-pointer">
                    <span className="text-gray-600">Add a Photo</span>
                  </div>
                </div>
              ) : (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full max-w-xs h-48 object-cover rounded-md border"
                  />
                  <button 
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors shadow-md"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Job Title */}
            <div>
              <input 
                type="text" 
                id="title" 
                name="title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Add job title"
                required
              />
            </div>

            {/* Job Description */}
            <div>
              <textarea 
                id="description" 
                name="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Describe the job"
                required
              />
            </div>

            {/* Location */}
            <div>
              <input 
                type="text" 
                id="location" 
                name="location"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Add location"
                autoComplete="off"
              />
            </div>

            {/* Reward Picker */}
            <div>
              <div className="flex items-center justify-center space-x-4 mb-3">
                <button
                  type="button"
                  onClick={() => adjustReward(-REWARD_INCREMENT)}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                    <path d="M5 12h14" />
                  </svg>
                </button>

                <span className="text-3xl font-bold text-gray-900 min-w-[120px] text-center">
                  {rewardAmount.toLocaleString()}
                </span>

                <button
                  type="button"
                  onClick={() => adjustReward(REWARD_INCREMENT)}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                    <path d="M12 5v14m-7-7h14" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-700 justify-center mb-2">
                <div className="w-4 h-4 relative">
                  <Image
                    src="/images/bitcoin-logo.png"
                    alt="Bitcoin"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                </div>
                <span>sats reward</span>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">+10 sat API fee</p>
                <div className="h-4 flex items-center justify-center">
                  {totalUsd && (
                    <p className="text-xs text-gray-500">
                      ${totalUsd} USD
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center mt-2">
                Amount to pay the person who completes this job
              </p>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Job Posting'}
            </button>
          </form>
        </div>

        {/* API Documentation */}
        <div className="mt-8 bg-white/90 backdrop-blur rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">API Call Preview</h2>
          <div className="space-y-4 text-sm">
            <div>
              <strong>Endpoint:</strong> <code className="bg-gray-100 px-2 py-1 rounded">POST {API_BASE_URL}/api/posts</code>
            </div>
            <div>
              <strong>Authentication:</strong> L402 (Lightning HTTP 402 Protocol)
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <strong>Total Cost:</strong> <span className="font-mono bg-green-100 px-2 py-1 rounded">{totalCost.toLocaleString()} sats</span> 
              <span className="text-gray-600"> ({rewardAmount.toLocaleString()} reward + 10 API fee)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Pay {totalCost} sats to Post Job</h3>
              <p className="text-gray-600 mb-6">
                Scan this QR code to pay {totalCost} sats ({rewardAmount} reward + {API_FEE} API fee)
              </p>
              
              <div className="flex justify-center mb-6">
                {currentInvoice && (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentInvoice)}`}
                    alt="QR Code"
                    className="border rounded"
                    width={200}
                    height={200}
                  />
                )}
              </div>
              
              <div className="space-y-4">
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <div className="mb-2">
                    <strong>Amount:</strong> {totalCost.toLocaleString()} sats ({totalUsd && `$${totalUsd} USD`})
                  </div>
                  <div className="break-all">
                    <strong>Invoice:</strong>
                    <div className="mt-1 font-mono text-xs">{currentInvoice}</div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={() => currentInvoice && navigator.clipboard.writeText(currentInvoice)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                  >
                    Copy Invoice
                  </button>
                  <button 
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="text-sm text-gray-500">
                  <div className="animate-pulse">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-blue-600">Waiting for Lightning payment...</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Pay the invoice above with your Lightning wallet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
            <div className="text-green-600 text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold mb-2">Job Posted Successfully!</h3>
            <p className="text-gray-600 mb-4">
              Your job posting has been created and is now live on Ganamos!
            </p>
            <div className="text-sm text-gray-500 mb-6 bg-gray-50 p-3 rounded">
              <strong>Post ID:</strong> {successData.postId}<br/>
              <strong>Job Reward:</strong> {successData.job_reward} sats<br/>
              <strong>API Fee:</strong> {successData.api_fee} sats<br/>
              <strong>Total Paid:</strong> {successData.total_paid} sats
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
              >
                Create Another Job
              </button>
              <button 
                onClick={() => window.open(`/post/${successData.postId}`, '_blank')}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
              >
                View Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
