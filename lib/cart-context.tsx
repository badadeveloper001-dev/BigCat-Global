'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRole } from '@/lib/role-context'

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  merchantId: string
  merchantName: string
  maxStock?: number
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
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.productId === newItem.productId)

      const requestedStock = Number(newItem.maxStock)
      const hasStockLimit = Number.isFinite(requestedStock) && requestedStock >= 0
      const maxStock = hasStockLimit ? Math.floor(requestedStock) : Number.POSITIVE_INFINITY

      if (existingItem) {
        return prevItems.map((i) =>
          i.productId === newItem.productId
            ? {
                ...i,
                price: newItem.price,
                maxStock: newItem.maxStock ?? i.maxStock,
                quantity: Math.min(maxStock, i.quantity + newItem.quantity),
              }
            : i
        )
      }

      const quantity = Math.min(maxStock, Math.max(1, Math.floor(newItem.quantity)))
      return quantity > 0 ? [...prevItems, { ...newItem, quantity }] : prevItems
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prevItems) => prevItems.filter((i) => i.productId !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    setItems((prevItems) =>
      prevItems.map((i) => {
        if (i.productId !== productId) return i
        const stock = Number(i.maxStock)
        const boundedQuantity = Number.isFinite(stock)
          ? Math.min(Math.max(0, Math.floor(quantity)), Math.max(0, Math.floor(stock)))
          : Math.max(0, Math.floor(quantity))
        return { ...i, quantity: boundedQuantity }
      }).filter((i) => i.quantity > 0)
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
