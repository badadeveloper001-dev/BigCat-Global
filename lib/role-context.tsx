'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  applyCountryPreset,
  buildDefaultPreferences,
  DEFAULT_GLOBAL_PREFERENCES,
  detectCountryAndRegionFromBrowser,
  detectCountryFromBrowser,
  type GlobalPreferences,
  type SupportedCountry,
} from '@/lib/global-market-config'

interface User {
  userId: string
  email: string
  phone?: string
  name?: string
  city?: string
  state?: string
  location?: string
  latitude?: number
  longitude?: number
  role: 'buyer' | 'merchant' | 'admin' | 'orchid_admin' | 'trade_logistics_admin' | 'support'
  merchantType?: 'products' | 'services'
  merchantProfile?: any
  region?: string
}

interface RoleContextType {
  role: string | null
  user: User | null
  preferences: GlobalPreferences
  setRole: (role: string | null) => void
  setUser: (user: User | null) => void
  setPreferences: (preferences: GlobalPreferences) => void
  setCountry: (country: SupportedCountry) => void
  isLoading: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<string | null>(null)
  const [user, setUserState] = useState<User | null>(null)
  const [preferences, setPreferencesState] = useState<GlobalPreferences>(DEFAULT_GLOBAL_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let isActive = true

    const initializePreferences = async () => {
      const storedPreferences = localStorage.getItem('globalPreferences')
      if (storedPreferences) {
        try {
          const parsed = JSON.parse(storedPreferences)
          setPreferencesState({ ...DEFAULT_GLOBAL_PREFERENCES, ...parsed })
          return
        } catch {
          // fall through to browser detection
        }
      }

      const detectedPreferences = await detectCountryAndRegionFromBrowser()
      if (!isActive) return
      setPreferencesState(detectedPreferences)
    }

    const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    if (!hasSupabaseConfig) {
      const stored = localStorage.getItem('userRole')
      const storedUser = localStorage.getItem('userData')
      if (stored) setRoleState(stored)
      if (storedUser) {
        try { setUserState(JSON.parse(storedUser)) } catch {}
      }
      setIsLoading(false)
      return
    }

    const clearLocalAuthState = () => {
      localStorage.removeItem('userRole')
      localStorage.removeItem('userData')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const projectRef = (() => {
        try {
          const host = new URL(supabaseUrl).hostname
          return host.split('.')[0] || ''
        } catch {
          return ''
        }
      })()

      if (projectRef) {
        localStorage.removeItem(`sb-${projectRef}-auth-token`)
      }
    }

    // Read localStorage immediately for a fast first render
    const stored = localStorage.getItem('userRole')
    const storedUser = localStorage.getItem('userData')
    const storedPreferences = localStorage.getItem('globalPreferences')
    if (stored) setRoleState(stored)
    if (storedUser) {
      try { setUserState(JSON.parse(storedUser)) } catch {}
    }
    if (storedPreferences) {
      try {
        const parsed = JSON.parse(storedPreferences)
        setPreferencesState({ ...DEFAULT_GLOBAL_PREFERENCES, ...parsed })
      } catch {
        const detectedCountry = detectCountryFromBrowser()
        setPreferencesState(buildDefaultPreferences(detectedCountry))
      }
    } else {
      const detectedCountry = detectCountryFromBrowser()
      setPreferencesState(buildDefaultPreferences(detectedCountry))
    }

    void initializePreferences()

    const initializeSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (!isActive) return

      if (error) {
        const message = String(error.message || '').toLowerCase()
        const isInvalidRefreshToken = message.includes('invalid refresh token')
          || message.includes('refresh token not found')

        if (isInvalidRefreshToken) {
          await supabase.auth.signOut({ scope: 'local' })
          clearLocalAuthState()
          setRoleState(null)
          setUserState(null)
          setIsLoading(false)
          return
        }
      }

      if (!session) {
        clearLocalAuthState()
        setRoleState(null)
        setUserState(null)
        setIsLoading(false)
        return
      }

      // If session exists but no role in localStorage, fetch profile from DB
      const storedRole = localStorage.getItem('userRole')
      if (session && !storedRole) {
        try {
          const response = await fetch(`/api/user/profile?userId=${session.user.id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
          })
          const result = await response.json()
          if (result.success && result.data && isActive) {
            const profile = result.data
            setRoleState(profile.role)
            setUserState({
              userId: profile.id,
              email: profile.email,
              phone: profile.phone || '',
              name: profile.name || profile.full_name || profile.business_name,
              city: profile.city || '',
              state: profile.state || '',
              role: profile.role,
              merchantType: profile.merchant_type,
            })
            localStorage.setItem('userRole', profile.role)
            localStorage.setItem('userData', JSON.stringify({
              userId: profile.id,
              email: profile.email,
              phone: profile.phone || '',
              name: profile.name || profile.full_name || profile.business_name,
              role: profile.role,
            }))
          } else {
            // Profile not in auth_users yet — fall back to user_metadata
            const metaRole = session.user.user_metadata?.role as string | undefined
            if (metaRole && isActive) {
              const fallbackUser = {
                userId: session.user.id,
                email: session.user.email || '',
                phone: '',
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
                role: metaRole as 'buyer' | 'merchant',
              }
              setRoleState(metaRole)
              setUserState(fallbackUser)
              localStorage.setItem('userRole', metaRole)
              localStorage.setItem('userData', JSON.stringify(fallbackUser))
            }
          }
        } catch {
          // Fall back to user_metadata
          const metaRole = session.user.user_metadata?.role as string | undefined
          if (metaRole && isActive) {
            setRoleState(metaRole)
            localStorage.setItem('userRole', metaRole)
          }
        }
      }

      setIsLoading(false)
    }

    initializeSession()

    // Sync auth events across tabs and after sign-in/sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!isActive) return

      if (event === 'SIGNED_IN' && session?.user) {
        const pendingRole = localStorage.getItem('pendingOAuthRole') as 'buyer' | 'merchant' | null

        try {
          const response = await fetch(`/api/user/profile?userId=${session.user.id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
          })
          const result = await response.json()
          if (result.success && result.data && isActive) {
            const profile = result.data
            const role = (pendingRole || profile.role || 'buyer') as string
            setRoleState(role)
            setUserState({
              userId: profile.id,
              email: profile.email,
              phone: profile.phone || '',
              name: profile.name || profile.full_name || profile.business_name,
              city: profile.city || '',
              state: profile.state || '',
              role: role as any,
              merchantType: profile.merchant_type,
            })
            localStorage.setItem('userRole', role)
            localStorage.setItem('userData', JSON.stringify({ userId: profile.id, email: profile.email, name: profile.name || profile.full_name, role }))
            if (pendingRole) {
              localStorage.removeItem('pendingOAuthRole')
              if (profile.role !== pendingRole) {
                fetch('/api/user/profile', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                  body: JSON.stringify({ userId: session.user.id, updates: { role: pendingRole } }),
                }).catch(() => {})
              }
            }
          } else {
            const role = pendingRole || 'buyer'
            if (isActive) {
              const fallback = { userId: session.user.id, email: session.user.email || '', phone: '', name: session.user.user_metadata?.full_name || '', role: role as any }
              setRoleState(role)
              setUserState(fallback)
              localStorage.setItem('userRole', role)
              localStorage.setItem('userData', JSON.stringify(fallback))
              if (pendingRole) localStorage.removeItem('pendingOAuthRole')
            }
          }
        } catch {
          const role = pendingRole || 'buyer'
          if (isActive) {
            setRoleState(role)
            localStorage.setItem('userRole', role)
            if (pendingRole) localStorage.removeItem('pendingOAuthRole')
          }
        }
        setIsLoading(false)
        return
      }

      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setIsLoading(false)
        return
      }

      if (event === 'SIGNED_OUT' || !session) {
        clearLocalAuthState()
        setRoleState(null)
        setUserState(null)
        setIsLoading(false)
      }
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  const setRole = (newRole: string | null) => {
    setRoleState(newRole)
    if (newRole) {
      localStorage.setItem('userRole', newRole)
    } else {
      localStorage.removeItem('userRole')
      // Sign out from Supabase Auth when clearing role
      createClient().auth.signOut()
    }
  }

  const setUser = (newUser: User | null) => {
    setUserState(newUser)
    if (newUser) {
      localStorage.setItem('userData', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('userData')
    }
  }

  const setPreferences = (nextPreferences: GlobalPreferences) => {
    setPreferencesState(nextPreferences)
    localStorage.setItem('globalPreferences', JSON.stringify(nextPreferences))
  }

  const setCountry = (country: SupportedCountry) => {
    setPreferences(applyCountryPreset(preferences, country))
  }

  return (
    <RoleContext.Provider value={{ role, user, preferences, setRole, setUser, setPreferences, setCountry, isLoading }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within RoleProvider')
  }
  return context
}
