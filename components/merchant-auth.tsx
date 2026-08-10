"use client"

import { useState } from "react"
import { useRole } from "@/lib/role-context"
import { createClient } from "@/lib/supabase/client"
import { BrandWordmark } from "./brand-wordmark"
import { OTPVerification } from "./otp-verification"
import { ArrowLeft, Building2, Eye, EyeOff, Mail, Lock, MapPin, Phone, Hash, Loader2, CheckCircle2, Store, MessageCircle } from "lucide-react"

declare global {
  interface Window {
    google?: any
    __googleScriptLoaded?: boolean
  }
}

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
]

const CHINESE_REGIONS = [
  'Guangdong',
  'Zhejiang',
  'Jiangsu',
  'Shanghai',
  'Beijing',
  'Shandong',
  'Fujian',
  'Sichuan',
]

export function MerchantAuth({
  onBack,
}: {
  onBack: () => void
}) {
  const { setRole, setUser } = useRole()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showOtpVerification, setShowOtpVerification] = useState(false)

  const formatMerchantLocation = (city?: string | null, state?: string | null, location?: string | null) => {
    const normalizedCity = city?.trim()
    const normalizedState = state?.trim()

    if (normalizedCity && normalizedState) {
      return `${normalizedCity}, ${normalizedState}`
    }

    return location || normalizedCity || normalizedState || ""
  }

  const normalizeMerchantUser = (user: any) => ({
    userId: user.id,
    email: user.email,
    phone: user.phone,
    name: user.business_name || user.name,
    role: "merchant" as const,
    merchantType: user.merchant_type || 'products',
    merchantProfile: {
      merchant_type: user.merchant_type || 'products',
      business_name: user.business_name || user.name,
      business_description: user.business_description || "",
      business_category: user.business_category || "",
      website_theme: user.website_theme || undefined,
      website_layout: user.website_layout || undefined,
      smedan_id: user.smedan_id || "",
      cac_id: user.cac_id || "",
      country: user.country || 'NG',
      verification_status: user.verification_status || '',
      verification_module: user.verification_module || '',
      setup_completed: Boolean(user.setup_completed),
      city: user.city || "",
      state: user.state || "",
      location: formatMerchantLocation(user.city, user.state, user.location),
      avatar_url: user.avatar_url || "",
      logo_url: user.logo_url || user.avatar_url || "",
    },
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [otpDeliveryMethod, setOtpDeliveryMethod] = useState<'email' | 'whatsapp'>('email')
  const [error, setError] = useState<string>("")
  const [warningMessage, setWarningMessage] = useState<string>("")
  const [merchantType, setMerchantType] = useState<'products' | 'services'>('products')
  const [successMessage, setSuccessMessage] = useState<string>("")

  const [verifiedMerchantProfile, setVerifiedMerchantProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    password: "",
    smedanId: "",
    cacId: "",
    country: "NG",
    governmentIdNumber: "",
    bankVerificationRef: "",
    chineseVerificationNote: "",
  })

  const loadMerchantProfile = async (userId: string, accessToken: string) => {
    const response = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    const result = await response.json()
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load merchant profile.')
    }

    return result.data
  }

  const requestMerchantOtp = async () => {
    const response = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        role: 'merchant',
        phone: formData.phone,
        deliveryMethod: otpDeliveryMethod,
      }),
    })

    return response.json()
  }

  const verifyMerchantOtp = async (otp: string) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otp,
        email: formData.email,
        password: formData.password,
        name: formData.businessName,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        role: 'merchant',
        smedanId: formData.smedanId,
        cacId: formData.cacId,
        merchantType,
        country: formData.country,
        governmentIdNumber: formData.governmentIdNumber,
        bankVerificationRef: formData.bankVerificationRef,
        verificationModule: formData.country === 'CN' ? 'Chinese Business Verification' : 'Nigerian Merchant Verification',
      }),
    })

    const result = await response.json()
    if (!result.success || !result.data) return result

    const supabase = createClient()
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })

    if (sessionError || !sessionData.session || !sessionData.user) {
      return { success: false, error: sessionError?.message || 'Failed to establish your session. Please try again.' }
    }

    const profile = await loadMerchantProfile(sessionData.user.id, sessionData.session.access_token)
    setVerifiedMerchantProfile(profile)
    return { success: true }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setWarningMessage("")
    setSuccessMessage("")
    setLoading(true)

    try {
      const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      if (!hasSupabaseConfig) {
        if (isSignUp) {
          const demoUser = {
            id: `demo-merchant-${Date.now()}`,
            email: formData.email,
            phone: formData.phone,
            business_name: formData.businessName,
            name: formData.businessName,
            merchant_type: merchantType,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            role: 'merchant',
          }
          setUser(normalizeMerchantUser(demoUser))
          setRole('merchant')
          setSuccessMessage('Demo merchant sign-up complete. You are now signed in locally.')
          return
        }

        const demoUser = {
          id: 'demo-merchant-local',
          email: formData.email,
          phone: '',
          business_name: formData.email.split('@')[0],
          name: formData.email.split('@')[0],
          merchant_type: merchantType,
          city: '',
          state: '',
          country: formData.country,
          role: 'merchant',
        }
        setUser(normalizeMerchantUser(demoUser))
        setRole('merchant')
        setSuccessMessage('Demo merchant login successful. You are signed in locally.')
        return
      }

      const supabase = createClient()

      if (isSignUp) {
        const result = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.businessName,
            phone: formData.phone,
            city: formData.city,
            state: formData.state,
            role: 'merchant',
            smedanId: formData.smedanId,
            cacId: formData.cacId,
            merchantType,
            country: formData.country,
            governmentIdNumber: formData.governmentIdNumber,
            bankVerificationRef: formData.bankVerificationRef,
            verificationModule: formData.country === 'CN' ? 'Chinese Business Verification' : 'Nigerian Merchant Verification',
          }),
        }).then(r => r.json())

        if (!result.success) {
          setError(result.error || 'Failed to create account')
          return
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (sessionError || !sessionData.session || !sessionData.user) {
          setError(sessionError?.message || 'Account created but failed to sign in. Please try logging in.')
          return
        }

        const profile = await loadMerchantProfile(sessionData.user.id, sessionData.session.access_token)
        setUser(normalizeMerchantUser(profile))
        setRole('merchant')
        setSuccessMessage('Account created successfully!')
        return
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (sessionError || !sessionData.session || !sessionData.user) {
        setError(sessionError?.message || 'Invalid email or password.')
        return
      }

      const profile = await loadMerchantProfile(sessionData.user.id, sessionData.session.access_token)
      if (profile.role !== 'merchant') {
        await supabase.auth.signOut()
        setError('This account is not a merchant account. Please use the buyer login.')
        return
      }

      setUser(normalizeMerchantUser(profile))
      setRole('merchant')
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      console.error("[v0] Auth error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const ensureGoogleScript = async () => {
    if (typeof window === 'undefined') return false
    if (window.google?.accounts?.id) return true

    if (!window.__googleScriptLoaded) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => {
          window.__googleScriptLoaded = true
          resolve()
        }
        script.onerror = () => reject(new Error('Failed to load Google script'))
        document.head.appendChild(script)
      })
    }

    return Boolean(window.google?.accounts?.id)
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setSuccessMessage('')
    setGoogleLoading(true)

    try {
      if (isSignUp) {
        setError('Use the merchant signup form so we can capture your business state and city.')
        return
      }
      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      if (!googleClientId) {
        setError('Google sign-in is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID.')
        return
      }

      const loaded = await ensureGoogleScript()
      if (!loaded || !window.google?.accounts?.id) {
        setError('Failed to initialize Google sign-in.')
        return
      }

      const credential = await new Promise<string>((resolve, reject) => {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response?.credential) resolve(response.credential)
            else reject(new Error('No Google credential received'))
          },
        })

        window.google.accounts.id.prompt((notification: any) => {
          const skipped = notification?.isSkippedMoment?.()
          const notDisplayed = notification?.isNotDisplayed?.()
          if (skipped || notDisplayed) {
            reject(new Error('Google prompt was closed before completing sign in.'))
          }
        })
      })

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential, role: 'merchant' }),
      })

      const result = await response.json()
      if (!result.success || !result.data?.user) {
        setError(result.error || 'Google sign-in failed')
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      })

      if (signInError) {
        setError(signInError.message || 'Failed to establish your Google session.')
        return
      }

      setUser(normalizeMerchantUser(result.data.user))
      setRole('merchant')
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BrandWordmark compact />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-3xl shadow-2xl border border-border/50 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-5 shadow-lg shadow-primary/25">
                <Store className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isSignUp ? "Create Merchant Account" : "Merchant Portal"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isSignUp ? "Start selling on our marketplace" : "Access your merchant dashboard"}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="text-green-700 dark:text-green-400 text-sm font-medium">{successMessage}</p>
                </div>
              </div>
            )}

            {warningMessage && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">{warningMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your business email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Business Name</label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        name="businessName"
                        placeholder="Enter your registered business name"
                        value={formData.businessName}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                        required
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Get code through</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose where we should send your verification code.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOtpDeliveryMethod('email')}
                        className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                          otpDeliveryMethod === 'email'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </button>

                      <button
                        type="button"
                        onClick={() => setOtpDeliveryMethod('whatsapp')}
                        className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                          otpDeliveryMethod === 'whatsapp'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Business Location</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add your state and city so buyers can find your store more easily.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">State</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                          <select
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                            required
                          >
                            <option value="">Select your region</option>
                            {(formData.country === 'CN' ? CHINESE_REGIONS : NIGERIAN_STATES).map((stateName) => (
                              <option key={stateName} value={stateName}>
                                {stateName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">City</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <input
                            type="text"
                            name="city"
                            placeholder="Enter your city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Operating Country</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                      >
                        <option value="NG">Nigeria</option>
                        <option value="CN">China</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">What will you offer?</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose whether you want to sell physical products or offer services. This determines your dashboard.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMerchantType('products')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          merchantType === 'products'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <div className="text-sm font-semibold">📦 Products</div>
                        <div className="text-xs mt-1">Sell physical items</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMerchantType('services')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          merchantType === 'services'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <div className="text-sm font-semibold">🔧 Services</div>
                        <div className="text-xs mt-1">Offer professional services</div>
                      </button>
                    </div>
                  </div>

                  {formData.country === 'NG' ? (
                    <>
                      <div className="space-y-2">
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <input
                            type="text"
                            name="smedanId"
                            placeholder="SMEDAN registration ID (optional)"
                            value={formData.smedanId}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          CAC Registration ID {merchantType === 'services' ? '(optional for service merchants)' : ''}
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <input
                            type="text"
                            name="cacId"
                            placeholder={merchantType === 'services' ? 'Enter CAC registration ID (optional)' : 'Enter CAC registration ID'}
                            value={formData.cacId}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                            required={merchantType !== 'services'}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Government-issued ID</label>
                        <input
                          type="text"
                          name="governmentIdNumber"
                          placeholder="Enter ID number"
                          value={formData.governmentIdNumber}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Bank Verification Reference</label>
                        <input
                          type="text"
                          name="bankVerificationRef"
                          placeholder="Enter bank verification reference"
                          value={formData.bankVerificationRef}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-2">
                      <p className="text-sm font-semibold text-foreground">Chinese Business Verification</p>
                      <p className="text-xs text-muted-foreground">
                        Placeholder module enabled. Full requirements will be connected after Orchid API discussions.
                      </p>
                      <textarea
                        name="chineseVerificationNote"
                        value={formData.chineseVerificationNote}
                        onChange={(e) => setFormData({ ...formData, chineseVerificationNote: e.target.value })}
                        className="w-full min-h-[72px] px-3 py-2 bg-background border border-border rounded-xl text-sm"
                        placeholder="Add any current business verification notes (optional)"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-11 pr-12 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isSignUp ? "Sending OTP..." : "Signing In..."}
                  </>
                ) : (
                  <>{isSignUp ? "Create Account" : "Sign In"}</>
                )}
              </button>
            </form>

            <div className="mt-4">
              {isSignUp ? (
                <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                  Merchant sign-up now verifies the business email first before creating the account.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full py-3 px-4 bg-white border border-border text-foreground font-semibold rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
                </button>
              )}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setShowOtpVerification(false)
                  setVerifiedMerchantProfile(null)
                  setOtpDeliveryMethod('email')
                  setError("")
                  setWarningMessage("")
                  setSuccessMessage("")
                  setFormData({
                    businessName: "",
                    email: "",
                    phone: "",
                    city: "",
                    state: "",
                    password: "",
                    smedanId: "",
                    cacId: "",
                    country: "NG",
                    governmentIdNumber: "",
                    bankVerificationRef: "",
                    chineseVerificationNote: "",
                  })
                }}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
