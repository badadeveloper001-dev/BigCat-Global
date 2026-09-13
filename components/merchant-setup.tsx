"use client"
import { UiText, UiValue, UiAttributes } from "@/components/ui-language"


import { useState } from "react"
import { Store, FileText, MapPin, Tag, Image, Loader2, Check, AlertCircle } from "lucide-react"

interface MerchantSetupProps {
  userId: string
  smedanId: string
  onBack?: () => void
  onComplete: (profile: any) => void
}

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports & Outdoors',
  'Books & Media',
  'Toys & Games',
  'Food & Beverages',
  'Health & Beauty',
  'Automotive',
  'Office Supplies',
  'Other'
]

export function MerchantSetup({ userId, smedanId, onComplete, onBack }: MerchantSetupProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [formData, setFormData] = useState({
    businessName: "",
    businessDescription: "",
    category: "",
    location: "",
    logoFile: null as File | null,
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file must be less than 5MB')
      return
    }

    setFormData(prev => ({
      ...prev,
      logoFile: file,
    }))

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Client-side validation
      if (!formData.businessName.trim()) {
        setError("Business name is required")
        setLoading(false)
        return
      }

      if (!formData.businessDescription.trim()) {
        setError("Business description is required")
        setLoading(false)
        return
      }

      if (!formData.category) {
        setError("Please select a category")
        setLoading(false)
        return
      }

      if (!formData.location.trim()) {
        setError("Location is required")
        setLoading(false)
        return
      }

      // For now, use the preview URL as logo (in production, upload to Vercel Blob)
      const response = await fetch('/api/merchant/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          smedanId,
          businessName: formData.businessName,
          businessDescription: formData.businessDescription,
          category: formData.category,
          location: formData.location,
          logoUrl: logoPreview || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onComplete(result.data)
        }, 2000)
      } else {
        setError(result.error || "Failed to save setup information")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("[v0] Setup error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      {onBack && <button type="button" onClick={onBack} className="px-4 py-2 text-sm"><UiText text={"Back to sign in"} /></button>}
        <div className="max-w-md w-full bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border/50 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-6">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2"><UiText text={"Setup Complete!"} /></h2>
          <p className="text-muted-foreground mb-6">
            <UiText text={"Your business profile is ready. Redirecting to your dashboard..."} />{" "}</p>
          <div className="w-2 h-2 bg-primary rounded-full mx-auto animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex flex-col font-sans">
      {onBack && <button type="button" onClick={onBack} className="px-4 py-2 text-sm"><UiText text="Back to sign in" /></button>}
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4">
        <h1 className="text-center font-semibold text-foreground text-lg"><UiText text={"Setup Your Store"} /></h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-2xl">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground"><UiText text={"Getting Started"} /></span>
              <span className="text-xs text-muted-foreground"><UiText text={"Step 1 of 1"} /></span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-primary to-primary/80" />
            </div>
          </div>

          {/* Card Container */}
          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border/50 p-8 md:p-10">
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4 shadow-lg shadow-primary/25">
                <Store className="text-primary-foreground w-7 h-7" />
              </div>
              <h2 className="text-3xl font-bold text-foreground text-balance mb-2">
                <UiText text={"Tell Us About Your Business"} />{" "}</h2>
              <p className="text-muted-foreground">
                <UiText text={"Help customers discover and connect with your store"} />{" "}</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive font-medium"><UiValue value={error} /></p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">
                  <UiText text={"Business Logo"} />{" "}</label>
                <div className="relative">
                  <UiAttributes><input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                    aria-label="Upload business logo"
                  /></UiAttributes>
                  <label
                    htmlFor="logo-upload"
                    className="block cursor-pointer border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-secondary/30 transition-all"
                  >
                    {logoPreview ? (
                      <div className="flex flex-col items-center gap-3">
                        <UiAttributes><img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-xl object-cover" /></UiAttributes>
                        <p className="text-sm text-muted-foreground"><UiText text={"Click to change"} /></p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Image className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          <UiText text={"Drop your logo or click to browse"} />{" "}</p>
                        <p className="text-xs text-muted-foreground">
                          <UiText text={"PNG, JPG, or GIF (max 5MB)"} />{" "}</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  <UiText text={"Business Name"} />{" "}<span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <UiAttributes><input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="Your Business Name"
                    maxLength={100}
                    className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    aria-label="Business name"
                  /></UiAttributes>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  <UiText text={"Category"} />{" "}<span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <UiAttributes><select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all appearance-none cursor-pointer"
                    aria-label="Business category"
                  >
                    <option value=""><UiText text={"Select a category"} /></option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}><UiValue value={cat} /></option>
                    ))}
                  </select></UiAttributes>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  <UiText text={"Location"} />{" "}<span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <UiAttributes><input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                    maxLength={100}
                    className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    aria-label="Business location"
                  /></UiAttributes>
                </div>
              </div>

              {/* Business Description */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  <UiText text={"Business Description"} />{" "}<span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <UiAttributes><textarea
                    name="businessDescription"
                    value={formData.businessDescription}
                    onChange={handleInputChange}
                    placeholder="Tell customers about your business, products, and services..."
                    maxLength={1000}
                    rows={5}
                    className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
                    aria-label="Business description"
                  /></UiAttributes>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {formData.businessDescription.length}/1000
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <UiValue value={loading ? "Setting Up Your Store..." : "Complete Setup"} />
              </button>
            </form>
          </div>

          {/* Help Text */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            <UiText text={"You can always update this information later from your merchant settings"} />{" "}</p>
        </div>
      </main>
    </div>
  )
}
