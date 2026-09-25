import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './Hooks/hooks'
import { useState, useEffect, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { updateQuantity, removeFromCart, loadCart, updateQuantityAPI, removeFromCartAPI, clearCartLocal, clearCartAPI } from './Redux/Slices/cartSlice'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import toast from 'react-hot-toast'
import { openLoginDrawer } from './Redux/Slices/authSlice'
import { authService } from '../Services/authService'
import { useTranslation } from 'react-i18next'
import apiClient from '../Services/apiClient'
import { API_ENDPOINTS } from '../config/api'
import { AlertTriangle } from 'lucide-react'
import { useTheme } from '../Context/ThemeContext'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface MenuItem {
  id: number
  name: string
  price: number
  description: string
  veg: boolean
  is_available?: boolean
}

interface CartItem extends MenuItem {
  quantity: number
  restaurantName: string
  cartItemId?: number
  restaurantId?: number
}

interface PlacedOrder {
  id: number
  customer_name: string
  address: string
  total_price: number
  restaurant_name: string
  eta: string
}

const FREE_DELIVERY_THRESHOLD = 300
const FIXED_DELIVERY_FEE = 40
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID as string

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Cart() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const { isAuthenticated: auth0Authenticated } = useAuth0()
  const currentUser = authService.getCurrentUser()
  const customUser = currentUser?.username ?? null
  const isUserAuthenticated = auth0Authenticated || !!customUser

  const { items: cartItems } = useAppSelector(state => state.cart) as { items: CartItem[] }

  const [address, setAddress] = useState(() => {
    return localStorage.getItem('ck_delivery_address') || ''
  })
  const [phone, setPhone] = useState(() => {
    return localStorage.getItem('ck_phone_number') || (currentUser as any)?.phone_number || ''
  })
  const [addressError, setAddressError] = useState(false)
  const [phoneError, setPhoneError] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null)
  const addressRef = useRef<HTMLTextAreaElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (address.trim()) {
      localStorage.setItem('ck_delivery_address', address.trim())
    } else {
      localStorage.removeItem('ck_delivery_address')
    }
  }, [address])

  useEffect(() => {
    if (phone.trim()) {
      localStorage.setItem('ck_phone_number', phone.trim())
    } else {
      localStorage.removeItem('ck_phone_number')
    }
  }, [phone])

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      dispatch(loadCart())
    }
  }, [dispatch])

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const controller = new AbortController();
    const sseUrl = `${import.meta.env.VITE_API_BASE_URL}/orders/events`;

    fetchEventSource(sseUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      openWhenHidden: true,
      async onopen(response) {
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          return;
        }
      },
      signal: controller.signal,
      onmessage(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'MENU_ITEM_UPDATED') {
            dispatch(loadCart());
            if (data.item && !data.item.is_available) {
              toast.error(`"${data.item.name}" is now out of stock`);
            }
          }
        } catch (err) {
          console.error('SSE cart update error:', err);
        }
      },
      onerror(err) {
        console.warn('SSE cart connection error:', err);
      }
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.error('SSE connection error:', err);
      }
    });

    return () => controller.abort();
  }, [dispatch]);



  const itemsByRestaurant = cartItems.reduce((acc, item) => {
    if (!acc[item.restaurantName]) {
      acc[item.restaurantName] = []
    }
    acc[item.restaurantName].push(item)
    return acc
  }, {} as Record<string, CartItem[]>)



  const handleUpdateQuantity = (item: CartItem, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(item)
      return
    }
    if (item.cartItemId) {
      dispatch(updateQuantityAPI({
        cartItemId: item.cartItemId,
        quantity,
        menuItemId: item.id,
        restaurantName: item.restaurantName,
      }))
    } else {
      dispatch(updateQuantity({ id: item.id, quantity, restaurantName: item.restaurantName }))
    }
  }


  const handleRemoveItem = (item: CartItem) => {
    if (item.cartItemId) {
      dispatch(removeFromCartAPI({
        cartItemId: item.cartItemId,
        menuItemId: item.id,
        restaurantName: item.restaurantName,
      }))
    } else {
      dispatch(removeFromCart({ id: item.id, restaurantName: item.restaurantName }))
    }
  }

  const handleClearCart = async () => {
    if (window.confirm(t('Are you sure you want to clear your cart?'))) {
      try {
        if (isUserAuthenticated) {
          await dispatch(clearCartAPI()).unwrap()
        } else {
          dispatch(clearCartLocal())
        }
        toast.success(t('Cart cleared successfully'), {
          style: {
            backgroundColor: '#ffffff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            fontWeight: 600
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff'
          }
        })
      } catch (error) {
        toast.error(t('Failed to clear cart'), {
          style: {
            backgroundColor: '#ffffff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            fontWeight: 600
          }
        })
      }
    }
  }

  const calculateTotals = (items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const tax = subtotal * 0.05
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : FIXED_DELIVERY_FEE
    const total = subtotal + tax + deliveryFee
    return { subtotal, tax, deliveryFee, total }
  }
  const grandTotals = calculateTotals(cartItems)
  const amountNeededForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - grandTotals.subtotal)
  const deliveryProgress = Math.min(100, (grandTotals.subtotal / FREE_DELIVERY_THRESHOLD) * 100)

  const outOfStockItems = cartItems.filter(i => i.is_available === false)
  const hasOutOfStock = outOfStockItems.length > 0

  const handleCheckout = async () => {
    if (hasOutOfStock) {
      toast.error(t('Some items in your cart are currently out of stock. Please remove them before checkout.'))
      return
    }

    if (!isUserAuthenticated) {
      toast.error(t('Please log in before checkout'))
      dispatch(openLoginDrawer())
      return
    }

    if (!address.trim()) {
      setAddressError(true)
      addressRef.current?.focus()
      toast.error(t('Please enter your delivery address'), {
        style: {
          backgroundColor: '#ffffff',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          fontWeight: 600
        }
      })
      return
    }

    const cleanedPhone = phone.replace(/\D/g, '')
    if (cleanedPhone.length < 10) {
      setPhoneError(true)
      phoneRef.current?.focus()
      toast.error(t('Please enter a valid 10-digit contact mobile number for delivery'), {
        style: {
          backgroundColor: '#ffffff',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          fontWeight: 600
        }
      })
      return
    }

    setAddressError(false)
    setPhoneError(false)
    setPaymentLoading(true)

    const loaded = await loadRazorpayScript()
    if (!loaded) {
      toast.error('Failed to load payment gateway. Please try again.')
      setPaymentLoading(false)
      return
    }

    const amountInPaise = Math.round(grandTotals.total * 100)
    const restaurantNames = Object.keys(itemsByRestaurant).join(', ')

    const options = {
      key: RAZORPAY_KEY,
      amount: amountInPaise,
      currency: 'INR',
      name: 'CraveKart',
      description: `Order from ${restaurantNames}`,
      image: 'https://i.imgur.com/n5tjHFD.png',
      prefill: {
        name: currentUser?.username || '',
        email: currentUser?.email || '',
        contact: phone.trim(),
      },
      theme: { color: 'var(--color-primary, #f97316)' },
      modal: {
        ondismiss: () => {
          setPaymentLoading(false)
          toast('Payment cancelled', { icon: '❌' })
        }
      },
      handler: async (response: { razorpay_payment_id: string }) => {
        try {
          const orderItems = cartItems.map(item => ({
            menu_item_id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            restaurant_id: item.restaurantId ?? 0,
            restaurant_name: item.restaurantName,
          }))

          const { data } = await apiClient.post(API_ENDPOINTS.CREATE_ORDER, {
            address: address.trim(),
            items: orderItems,
            totalPrice: grandTotals.total,
            paymentId: response.razorpay_payment_id,
            phone_number: phone.trim(),
          })


          if (isUserAuthenticated) {
            await dispatch(clearCartAPI()).unwrap()
          } else {
            dispatch(clearCartLocal())
          }

          setAddress('')
          setPhone('')
          localStorage.removeItem('ck_delivery_address')
          localStorage.removeItem('ck_phone_number')
          const etaTime = new Date(Date.now() + 30 * 60 * 1000)
          const etaStr = etaTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

          setPlacedOrder({
            id: data.order.id,
            customer_name: data.order.customer_name,
            address: address.trim(),
            total_price: grandTotals.total,
            restaurant_name: restaurantNames,
            eta: etaStr,
          })
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Failed to save order. Please contact support.')
        } finally {
          setPaymentLoading(false)
        }
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', (_response: any) => {
      toast.error('Payment failed. Please try again.')
      setPaymentLoading(false)
    })
    rzp.open()
  }


  if (placedOrder) {
    return (
      <OrderSuccessModal
        order={placedOrder}
        onTrackOrder={() => { setPlacedOrder(null); navigate('/dashboard') }}
        onContinueShopping={() => { setPlacedOrder(null); navigate('/restaurant') }}
      />
    )
  }

  if (cartItems.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <p style={{ color: 'var(--color-text-muted)' }} className="text-lg">{t('Your cart is empty')}</p>
      </div>
    )
  }

  return (
    <>
      <div
        className="
        min-h-screen
        px-4
        sm:px-6
        md:px-10
        lg:px-16
        py-6
        sm:py-8
        lg:py-12
        max-w-7xl
        mx-auto
        "
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >



        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--color-text)' }}>
                {t('Your Orders')}
              </h1>
              <div className="mt-3 h-[2px] w-16" style={{ backgroundColor: 'var(--color-primary)' }} />
            </div>
            <button
              onClick={handleClearCart}
              className="text-sm font-medium px-4 py-2.5 rounded-xl border flex items-center gap-2 transition-all duration-200 hover:opacity-80  cursor-pointer w-fit"
              style={{
                borderColor: 'var(--color-error)',
                color: 'var(--color-error)',
                backgroundColor: 'transparent',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
              </svg>
              {t('Clear Cart')}
            </button>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-8">
            {hasOutOfStock && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-between gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{t('Some items in your cart are currently out of stock. Please remove them to proceed.')}</span>
                </div>
              </div>
            )}

            {Object.entries(itemsByRestaurant).map(([restaurantName, items]) => (
              <div key={restaurantName}>

                <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                    {restaurantName}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {items.length} {items.length === 1 ? t('item') : t('items')}
                  </p>
                </div>


                <div className="space-y-4">
                  {items.map(item => (
                    <CartItemCard
                      key={`${restaurantName}-${item.id}`}
                      item={item}
                      onQuantityChange={(qty) => handleUpdateQuantity(item, qty)}
                      onRemove={() => handleRemoveItem(item)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div
              className="rounded-2xl p-6 space-y-4"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                  {t('Delivery Address')}
                </h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {t('Where should we deliver your order?')}
              </p>
              <div className="relative">
                <textarea
                  ref={addressRef}
                  id="delivery-address"
                  rows={3}
                  value={address}
                  onChange={e => {
                    setAddress(e.target.value)
                    if (e.target.value.trim()) setAddressError(false)
                  }}
                  placeholder={t('Enter your full delivery address — flat no., building, street, city...')}
                  className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    border: addressError
                      ? '2px solid var(--color-error)'
                      : '2px solid var(--color-border)',
                    lineHeight: '1.6',
                  }}
                  onFocus={e => {
                    if (!addressError) e.target.style.borderColor = 'var(--color-primary)'
                  }}
                  onBlur={e => {
                    if (!addressError) e.target.style.borderColor = 'var(--color-border)'
                  }}
                />
                {address.trim() && (
                  <span
                    className="absolute right-3 top-3 text-green-500 text-lg"
                    title="Address entered"
                  >✓</span>
                )}
              </div>
              {addressError && (
                <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-error)' }}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('Delivery address is required before placing the order')}</span>
                </p>
              )}

              <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <h4 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                    {t('Contact Mobile Number')}
                  </h4>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('Used by the delivery partner to contact you upon arrival.')}
                </p>
                <div className="relative">
                  <input
                    ref={phoneRef}
                    type="tel"
                    id="contact-phone"
                    autoComplete="tel"
                    value={phone}
                    onChange={e => {
                      const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(cleaned);
                      if (cleaned.trim()) setPhoneError(false);
                    }}
                    placeholder={t('Enter your mobile number')}
                    maxLength={10}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                    style={{
                      backgroundColor: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      border: phoneError
                        ? '2px solid var(--color-error)'
                        : '2px solid var(--color-border)',
                    }}
                    onFocus={e => {
                      if (!phoneError) e.target.style.borderColor = 'var(--color-primary)'
                    }}
                    onBlur={e => {
                      if (!phoneError) e.target.style.borderColor = 'var(--color-border)'
                    }}
                  />
                  {phone.trim().length >= 10 && (
                    <span
                      className="absolute right-3 top-3 text-green-500 text-lg"
                      title="Phone number entered"
                    >✓</span>
                  )}
                </div>
                {phoneError && (
                  <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('Please enter a valid 10-digit mobile number')}</span>
                  </p>
                )}
              </div>
            </div>
          </div>


          <div
            className="sticky top-8 rounded-2xl p-6 space-y-4 h-fit"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h2 className="text-2xl font-bold">{t('Order Summary')}</h2>


            <div
              className="p-4 rounded-xl space-y-2 border"
              style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
                  {amountNeededForFreeDelivery === 0 ? t('Free Delivery Unlocked!') : t('Free Delivery Progress')}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  ₹{grandTotals.subtotal.toFixed(0)} / ₹{FREE_DELIVERY_THRESHOLD}
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${deliveryProgress}%`,
                    backgroundColor: deliveryProgress >= 100 ? '#16a34a' : 'var(--color-primary)',
                  }}
                />
              </div>

              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {amountNeededForFreeDelivery === 0 ? (
                  <span className="text-green-500 dark:text-green-400 font-medium flex items-center gap-1">
                    🎉 {t("Congratulations! You've unlocked FREE Delivery.")}
                  </span>
                ) : (
                  <>
                    {t('Add')}{' '}
                    <strong style={{ color: 'var(--color-text)' }}>₹{amountNeededForFreeDelivery.toFixed(2)}</strong>{' '}
                    {t('more to save ₹40 on delivery!')}
                  </>
                )}
              </p>
            </div>

            <div className="space-y-2 border-t border-b py-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>{t('Subtotal')}</span>
                <span>₹{grandTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>{t('Tax (5%)')}</span>
                <span>₹{grandTotals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>{t('Delivery')}</span>
                {grandTotals.deliveryFee === 0 ? (
                  <span className="font-semibold text-green-600 dark:text-green-400">{t('FREE')}</span>
                ) : (
                  <span>₹{grandTotals.deliveryFee.toFixed(2)}</span>
                )}
              </div>
            </div>

            <div className="flex justify-between text-xl font-bold">
              <span>{t('Total')}</span>
              <span style={{ color: 'var(--color-primary)' }}>₹{grandTotals.total.toFixed(2)}</span>
            </div>

            {Object.keys(itemsByRestaurant).length > 1 && (
              <div
                className="p-3 rounded-lg text-sm text-center"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text-muted)'
                }}
              >
                {t('You have items from')} {Object.keys(itemsByRestaurant).length} {t('restaurants')}
              </div>
            )}


            {address.trim() && (
              <div
                className="w-full rounded-xl px-4 py-3 text-sm font-medium"
                style={{
                  backgroundColor: 'rgba(22,163,74,0.12)',
                  border: '1px solid rgba(22,163,74,0.3)',
                  color: '#16a34a',
                }}
              >
                <span className="opacity-75 font-semibold">{t('Delivering to')}: </span>
                <span style={{ color: '#15803d' }}>{address.trim()}</span>
              </div>
            )}

            <button
              id="proceed-to-checkout-btn"
              onClick={handleCheckout}
              disabled={paymentLoading || hasOutOfStock}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {paymentLoading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  {t('Processing...')}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {t('Proceed to Checkout')}
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/restaurant')}
              className="w-full py-3 rounded-lg font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-primary)',
                border: '2px solid var(--color-primary)'
              }}
            >
              {t('Continue Shopping')}
            </button>
          </div>
        </div>
      </div>
    </>

  )
}


function OrderSuccessModal({
  order,
  onTrackOrder,
  onContinueShopping,
}: {
  order: PlacedOrder
  onTrackOrder: () => void
  onContinueShopping: () => void
}) {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div
        className={`relative rounded-3xl p-8 flex flex-col items-center gap-5 max-w-md w-full mx-auto shadow-2xl border transition-colors ${isDark
          ? 'bg-[#09090b] border-zinc-800/80 text-zinc-100 shadow-black'
          : 'bg-white border-gray-100 text-gray-900'
          }`}
      >
        <div className="relative flex items-center justify-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center border-2 animate-bounce ${isDark
              ? 'bg-emerald-950/30 border-emerald-500/80'
              : 'bg-emerald-50 border-emerald-500'
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('Order Placed!')}
          </h2>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
            {t('Your delicious food is on its way!')}
          </p>
        </div>

        <div
          className={`w-full rounded-2xl p-4 space-y-3 border text-xs sm:text-sm ${isDark
            ? 'bg-[#121215] border-zinc-800 text-zinc-200'
            : 'bg-gray-50 border-gray-200/80 text-gray-800'
            }`}
        >
          <div className="flex justify-between items-center">
            <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Order ID</span>
            <span className="font-bold text-orange-500">#{order.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Restaurant</span>
            <span className={`font-semibold text-right max-w-[60%] ${isDark ? 'text-white' : 'text-gray-900'}`}>{order.restaurant_name}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Deliver to</span>
            <span className={`font-semibold text-right max-w-[60%] text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>{order.address}</span>
          </div>
          <div className={`flex justify-between items-center pt-1 border-t ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
            <span className={`${isDark ? 'text-zinc-400' : 'text-gray-500'} font-medium`}>Amount Paid</span>
            <span className="font-bold text-emerald-400 text-base">₹{order.total_price.toFixed(2)}</span>
          </div>
        </div>

        <div
          className={`w-full rounded-xl px-4 py-3 border ${isDark
            ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
            : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
        >
          <p className="text-xs leading-relaxed font-medium text-center sm:text-left">
            {t('You can track your order status anytime from your')}{' '}
            <strong className={`font-bold ${isDark ? 'text-orange-400' : 'text-blue-600'}`}>{t('Dashboard')}</strong>.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5 pt-1">
          <button
            id="order-track-dashboard-btn"
            onClick={onTrackOrder}
            className="w-full py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.99] cursor-pointer transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            {t('Track My Order')}
          </button>

          <button
            id="order-continue-shopping-btn"
            onClick={onContinueShopping}
            className={`w-full py-3 rounded-xl font-semibold border cursor-pointer transition-all ${isDark
              ? 'text-zinc-300 border-zinc-800 hover:bg-zinc-800/60'
              : 'text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
          >
            {t('Continue Shopping')}
          </button>
        </div>
      </div>
    </div>
  )
}


interface CartItemCardProps {
  item: CartItem
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

function CartItemCard({ item, onQuantityChange, onRemove }: CartItemCardProps) {
  const { t } = useTranslation()
  const isOutOfStock = item.is_available === false

  return (
    <div
      className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl"
      style={{ backgroundColor: 'var(--color-bg-card)' }}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0"
            style={{ borderColor: item.veg ? '#16a34a' : '#881337' }}
          >
            {item.veg ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
            ) : (
              <span
                className="w-2 h-2 bg-[#881337]"
                style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
              />
            )}
          </span>
          <h3 className="font-semibold text-base">
            {item.name}
            {isOutOfStock && (
              <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 ml-1.5">
                ({t('Out of Stock')})
              </span>
            )}
          </h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {item.description}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 rounded-lg p-1" style={{ backgroundColor: 'var(--color-bg)' }}>
          <button
            onClick={() => onQuantityChange(item.quantity - 1)}
            className="w-8 h-8 rounded font-bold flex items-center justify-center hover:opacity-75 cursor-pointer"
            style={{ color: 'var(--color-primary)' }}
          >
            −
          </button>
          <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
          <button
            onClick={() => !isOutOfStock && onQuantityChange(item.quantity + 1)}
            disabled={isOutOfStock}
            className={`w-8 h-8 rounded font-bold flex items-center justify-center ${isOutOfStock ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-75 cursor-pointer'
              }`}
            style={{ color: 'var(--color-primary)' }}
          >
            +
          </button>
        </div>

        <div className="flex flex-col justify-center text-right min-w-[90px] h-10">
          <p className="text-lg font-bold leading-none" style={{ color: 'var(--color-primary)' }}>
            ₹{(item.price * item.quantity).toFixed(2)}
          </p>
          <p className={`text-[11px] leading-tight mt-1 transition-opacity duration-200 ${item.quantity > 1 ? 'opacity-100' : 'opacity-0 select-none'}`} style={{ color: 'var(--color-text-muted)' }}>
            ₹{item.price} {t('each')}
          </p>
        </div>


        <button
          onClick={onRemove}
          className="p-2 rounded-lg transition-colors hover:opacity-75 cursor-pointer flex items-center justify-center"
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-error)'
          }}
          title={t('Remove item')}
          aria-label={t('Remove item')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}