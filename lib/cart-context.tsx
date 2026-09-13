'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRole } from '@/lib/role-context'

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  minimum_order_quantity?: number
  stock?: number
  quantity: number
  merchantId: string
  merchantName: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useRole()
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((newItem: CartItem) => {
    const minimum = Math.max(1, newItem.minimum_order_quantity || 1)
    if (newItem.stock !== undefined && newItem.stock < minimum) return
    newItem = { ...newItem, quantity: Math.max(minimum, newItem.quantity) }
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.productId === newItem.productId)

      if (existingItem) {
        return prevItems.map((i) =>
          i.productId === newItem.productId
            ? { ...i, ...newItem, quantity: Math.min(newItem.stock ?? Infinity, i.quantity + newItem.quantity) }
            : i
        )
      }

      return [...prevItems, { ...newItem, quantity: Math.min(newItem.stock ?? Infinity, newItem.quantity) }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prevItems) => prevItems.filter((i) => i.productId !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isSafeInteger(quantity)) return

    setItems((prevItems) =>
      prevItems.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(i.minimum_order_quantity || 1, Math.min(i.stock ?? Infinity, quantity)) } : i
      )
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])

    if (!user?.userId) return

    fetch('/api/automation/cart-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.userId,
        action: 'checked_out',
        itemCount: 0,
        cartValue: 0,
      }),
    }).catch(() => null)
  }, [user?.userId])

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  }, [items])

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0)
  }, [items])

  useEffect(() => {
    if (!user?.userId) return

    if (items.length === 0) return

    const timeout = setTimeout(() => {
      const itemCount = items.reduce((count, item) => count + item.quantity, 0)
      const cartValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

      fetch('/api/automation/cart-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          action: 'active',
          itemCount,
          cartValue,
          metadata: {
            productIds: items.map((item) => item.productId),
          },
        }),
      }).catch(() => null)
    }, 700)

    return () => clearTimeout(timeout)
  }, [items, user?.userId])

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
