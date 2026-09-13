'use client'
import { UiText, UiValue, UiAttributes } from "@/components/ui-language"


import { useState, useRef } from 'react'
import { LocalizedText } from '@/components/localized-text'
import Link from 'next/link'
import { Mail, Phone, Clock, MessageSquare, Send, CheckCircle } from 'lucide-react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [reference, setReference] = useState('')
  const attempt = useRef({ signature: '', id: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (['bug','confusion','suggestion'].includes(subject)) {
      setSaving(true)
      setFeedbackError('')
      const signature = subject + ':' + message.trim()
      if (attempt.current.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() }
      try {
        const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: attempt.current.id, category: subject, description: message }) })
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Could not save feedback')
        setReference(result.id)
        setSubmitted(true)
        attempt.current = { signature: '', id: '' }
      } catch (error) { setFeedbackError(error instanceof Error ? error.message : 'Could not save feedback') }
      finally { setSaving(false) }
      return
    }
    setReference('')
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)
    const subjectEncoded = encodeURIComponent(subject || 'BigCat Support Request')
    window.location.href = `mailto:support@bigcat.ng?subject=${subjectEncoded}&body=${body}`
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6C2BD9] to-[#4A1A9E] text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2"><UiText text={"Contact Us"} /></h1>
          <p className="text-white/80 text-sm"><UiText text={"We&rsquo;re here to help. Reach out and we&rsquo;ll get back to you as soon as possible."} /></p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Contact channels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="mailto:support@bigcat.ng"
            className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center text-center hover:border-primary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground"><UiText text={"Email"} /></p>
            <p className="text-xs text-muted-foreground mt-0.5"><UiText text={"support@bigcat.ng"} /></p>
            <p className="text-xs text-muted-foreground mt-0.5"><UiText text={"Reply within 24h"} /></p>
          </a>

          <a
            href="https://wa.me/2348000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center text-center hover:border-primary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
              <Phone className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm font-semibold text-foreground"><UiText text={"WhatsApp"} /></p>
            <p className="text-xs text-muted-foreground mt-0.5">+234 800 000 0000</p>
            <p className="text-xs text-muted-foreground mt-0.5"><UiText text={"Mon–Sat, 8am–8pm"} /></p>
          </a>

          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-foreground"><UiText text={"Support Hours"} /></p>
            <p className="text-xs text-muted-foreground mt-0.5"><UiText text={"Mon – Sat"} /></p>
            <p className="text-xs text-muted-foreground mt-0.5"><UiText text={"8:00am – 8:00pm WAT"} /></p>
          </div>
        </div>

        {/* Contact form */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border bg-secondary/30">
            <h2 className="font-semibold text-foreground text-sm"><UiText text={"Send Us a Message"} /></h2>
            <p className="text-xs text-muted-foreground mt-0.5"><UiText text={"Pilot feedback is saved here when signed in. Other support topics open your email app."} /></p>
          </div>
          {submitted ? (
            <div className="p-8 flex flex-col items-center text-center gap-3">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="font-semibold text-foreground"><UiValue value={reference ? 'Feedback saved: ' + reference : 'Your email app should have opened!'} /></p>
              <p className="text-sm text-muted-foreground"><UiValue value={reference ? "Keep this reference for follow-up. For urgent help, " : "If it did not open, "} /> {" "}<UiText text={"email us directly at"} />{" "}<a href="mailto:support@bigcat.ng" className="text-primary underline"><UiText text={"support@bigcat.ng"} /></a></p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-2 text-sm text-primary underline"
              >
                <UiText text={"Send another message"} />{" "}</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {feedbackError && <p role="alert" className="text-sm text-destructive"><UiValue value={feedbackError} /></p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1"><UiText text={"Your Name"} /></label>
                  <UiAttributes><input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Amaka Obi"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  /></UiAttributes>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1"><UiText text={"Email Address"} /></label>
                  <UiAttributes><input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  /></UiAttributes>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1"><UiText text={"Subject"} /></label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:border-primary transition-colors"
                >
                  <option value=""><UiText text={"Select a topic…"} /></option>
                  <option value="Order Issue"><UiText text={"Order Issue"} /></option>
                  <option value="Payment or Refund"><UiText text={"Payment or Refund"} /></option>
                  <option value="Merchant Verification"><UiText text={"Merchant Verification"} /></option>
                  <option value="Account Access"><UiText text={"Account Access"} /></option>
                  <option value="Dispute Resolution"><UiText text={"Dispute Resolution"} /></option>
                  <option value="Report a User"><UiText text={"Report a User"} /></option>
                  <option value="bug"><LocalizedText en="Pilot: Bug" zh="试点：错误" /></option>
                  <option value="confusion"><LocalizedText en="Pilot: Confusion" zh="试点：使用困惑" /></option>
                  <option value="suggestion"><LocalizedText en="Pilot: Suggestion" zh="试点：建议" /></option>
                  <option value="Other"><UiText text={"Other"} /></option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1"><UiText text={"Message"} /></label>
                <UiAttributes><textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail. Include your order number or username if relevant."
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none"
                /></UiAttributes>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
              >
                <Send className="w-4 h-4" />
                <UiValue value={saving ? 'Saving…' : 'Send Message'} />
              </button>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground pb-6 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors"><UiText text={"← Back to BigCat"} /></Link>
          <span>·</span>
          <Link href="/help" className="hover:text-foreground transition-colors"><UiText text={"Help Center"} /></Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors"><UiText text={"Terms of Service"} /></Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors"><UiText text={"Privacy Policy"} /></Link>
        </div>
      </div>
    </div>
  )
}
