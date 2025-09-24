"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'

// Global variables (like the working reference site)
let currentInvoice: string | null = null
let currentMacaroon: string | null = null
let paymentCheckInterval: NodeJS.Timeout | null = null
let bitcoinPrice: number | null = null
let jobCreationInProgress = false

export default function NewSimpleJobPage() {
  const [mounted, setMounted] = useState(false)
  const [rewardAmount, setRewardAmount] = useState(2000)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [bitcoinPriceState, setBitcoinPriceState] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<any>(null)
  const [copyButtonText, setCopyButtonText] = useState('Copy Invoice')
  const [invoiceTruncated, setInvoiceTruncated] = useState(true)

  useEffect(() => {
    setMounted(true)
    fetchBitcoinPrice()
  }, [])

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
    }
  }

  const calculateUsdValue = (sats: number) => {
    if (!bitcoinPriceState) return null
    const btcAmount = sats / 100000000
    const usdValue = btcAmount * bitcoinPriceState
    return usdValue.toFixed(2)
  }

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

  const removeImage = () => {
    setImagePreview(null)
    const input = document.getElementById('image') as HTMLInputElement
    if (input) input.value = ''
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const jobData: any = {
      title: formData.get('title'),
      description: formData.get('description'),
      location: formData.get('location') || null,
      latitude: null,
      longitude: null,
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
        const paymentData = await response.json()
        const authHeader = response.headers.get('WWW-Authenticate')
        
        if (!authHeader) {
          throw new Error('No WWW-Authenticate header in 402 response')
        }

        // Parse L402 challenge (same as reference site)
        const macaroonMatch = authHeader.match(/macaroon="([^"]+)"/)
        const invoiceMatch = authHeader.match(/invoice="([^"]+)"/)
        
        if (!macaroonMatch || !invoiceMatch) {
          throw new Error('Invalid L402 challenge format')
        }

        currentMacaroon = macaroonMatch[1]
        currentInvoice = invoiceMatch[1]

        setShowPaymentModal(true)
        startPaymentCheck(jobData)
        
      } else if (response.ok) {
        const result = await response.json()
        showSuccess(result.post_id, result)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create job posting')
      }
    } catch (error) {
      throw error
    }
  }

  // Simple payment check (like reference site)
  const startPaymentCheck = (jobData: any) => {
    // Clear any existing interval
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval)
    }
    
    jobCreationInProgress = false // Reset flag
    
    paymentCheckInterval = setInterval(async () => {
      await checkPaymentStatus(jobData)
    }, 2000)
    
    // Stop after 10 minutes
    setTimeout(() => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval)
        paymentCheckInterval = null
      }
    }, 600000)
  }

  const checkPaymentStatus = async (jobData: any) => {
    if (!currentMacaroon || !currentInvoice) {
      console.log('Missing L402 credentials')
      return
    }

    if (jobCreationInProgress) {
      console.log('Job creation already in progress, skipping check')
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
      
      if (statusData.success && statusData.settled && statusData.preimage) {
        console.log('Payment confirmed! Creating job...')
        
        // IMMEDIATELY stop checking and set flag
        if (paymentCheckInterval) {
          clearInterval(paymentCheckInterval)
          paymentCheckInterval = null
        }
        jobCreationInProgress = true
        
        // Create job
        const l402Token = `${currentMacaroon}:${statusData.preimage}`
        
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
        }
      }
    } catch (error) {
      console.error('Payment check error:', error)
    }
  }

  const copyInvoice = async () => {
    if (!currentInvoice) return
    
    try {
      await navigator.clipboard.writeText(currentInvoice)
      setCopyButtonText('✅ Copied!')
      setTimeout(() => setCopyButtonText('Copy Invoice'), 2000)
    } catch (error) {
      setCopyButtonText('❌ Copy Failed')
      setTimeout(() => setCopyButtonText('Copy Invoice'), 2000)
    }
  }

  const showSuccess = (postId: string, result: any) => {
    setSuccessData({ postId, ...result })
    setShowSuccessModal(true)
  }

  const copyInvoice = async () => {
    if (!currentInvoice) return
    
    try {
      await navigator.clipboard.writeText(currentInvoice)
      setCopyButtonText('✅ Copied!')
      setTimeout(() => setCopyButtonText('Copy Invoice'), 2000)
    } catch (error) {
      setCopyButtonText('❌ Copy Failed')
      setTimeout(() => setCopyButtonText('Copy Invoice'), 2000)
    }
  }

  const totalCost = rewardAmount + 10
  const totalUsd = calculateUsdValue(totalCost)

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="relative min-h-screen">
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
                    ×
                  </button>
                </div>
              )}
            </div>

            <input 
              type="text" 
              name="title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Add job title"
              required
            />

            <textarea 
              name="description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Describe the job"
              required
            />

            <input 
              type="text" 
              name="location"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Add location"
            />

            {/* Reward Picker */}
            <div>
              <div className="flex items-center justify-center space-x-4 mb-3">
                <button
                  type="button"
                  onClick={() => setRewardAmount(prev => Math.max(0, prev - 500))}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  −
                </button>

                <span className="text-3xl font-bold text-gray-900 min-w-[120px] text-center">
                  {rewardAmount.toLocaleString()}
                </span>

                <button
                  type="button"
                  onClick={() => setRewardAmount(prev => prev + 500)}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  +
                </button>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-700 justify-center mb-2">
                <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={16} height={16} />
                <span>sats reward</span>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">+10 sat API fee</p>
                {totalUsd && (
                  <p className="text-xs text-gray-500">${totalUsd} USD</p>
                )}
              </div>
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
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-6">Pay {totalCost} sats to Post Job</h3>
              
              <div className="flex justify-center mb-6">
                {currentInvoice && (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentInvoice)}`}
                    alt="QR Code"
                    width={200}
                    height={200}
                    className="border rounded"
                  />
                )}
              </div>
              
              <div className="space-y-4">
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <div className="mb-2">
                    <strong>Amount:</strong> {totalCost.toLocaleString()} sats {totalUsd && `($${totalUsd} USD)`}
                  </div>
                  <div>
                    <strong>Invoice:</strong>
                    <div 
                      className="mt-1 font-mono text-xs cursor-pointer" 
                      onClick={() => setInvoiceTruncated(!invoiceTruncated)}
                    >
                      {invoiceTruncated && currentInvoice ? 
                        `${currentInvoice.slice(0, 20)}...${currentInvoice.slice(-20)}` : 
                        currentInvoice
                      }
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={copyInvoice}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                  >
                    {copyButtonText}
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
                <div className="animate-pulse">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-blue-600">Waiting for Lightning payment...</p>
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
