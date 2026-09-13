"use client"

import { RoleProvider, useRole } from "@/lib/role-context"
import { CartProvider } from "@/lib/cart-context"
import { WishlistProvider } from "@/lib/wishlist-context"

function PreferenceBoundary({ children }: { children: React.ReactNode }) {
 const { preferencesReady } = useRole()
 if (!preferencesReady) return <div className="min-h-screen flex items-center justify-center" aria-busy="true"><span className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
 return <>{children}</>
}
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <WishlistProvider>
        <CartProvider>
          <PreferenceBoundary>{children}</PreferenceBoundary>
        </CartProvider>
      </WishlistProvider>
    </RoleProvider>
  )
}
