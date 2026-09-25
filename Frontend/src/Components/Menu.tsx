import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useAppSelector } from './Hooks/hooks'
import { useState, useEffect } from 'react'

import { useAppDispatch } from './Hooks/hooks'
import { addToCart, addToCartAPI } from './Redux/Slices/cartSlice'
import { fetchMenu } from './Redux/Slices/menuSlice'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import RestaurantMap from './RestaurantMap'
import { useLocation } from 'react-router-dom'
import apiClient from '../Services/apiClient'
import { API_ENDPOINTS } from '../config/api'
import { Tag } from 'lucide-react'



interface MenuItem {
  id: number
  name: string
  price: number
  description: string
  veg: boolean
  is_available?: boolean
  discount?: number
}

export default function Menu() {
  const location = useLocation()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [aiMatchedIds, setAiMatchedIds] = useState<Set<number>>(new Set())
  const [aiActive, setAiActive] = useState(false)
  const { items, loading, error, restaurantName, address, restaurantLat, restaurantLng, restaurantId } = useAppSelector(state => state.menu)
  const [filter, setFilter] = useState<'all' | 'veg' | 'nonveg'>('all')

  const [priceFilter, setPriceFilter] = useState<
    'all' | 'under100' | 'under200' | 'above200'>('all')




  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q')
    if (!q || !restaurantName) return
    const runAiSearch = async () => {
      try {
        const { data } = await apiClient.post(API_ENDPOINTS.AI_SEARCH_MENU, {
          query: q,
          restaurantName: restaurantName
        })
        const matchedItems: any[] = data.items ?? []
        const ids = new Set<number>(matchedItems.map((i: any) => i.id))
        setAiMatchedIds(ids)
        setAiActive(ids.size > 0)
      } catch (err) {
        console.error('Menu AI search error:', err)
      }
    }
    runAiSearch()
  }, [location.search, restaurantName])

  useEffect(() => {
    if (restaurantId && restaurantName) {
      dispatch(fetchMenu({
        restaurantId,
        restaurantName,
        restaurantLat: restaurantLat ?? 0,
        restaurantLng: restaurantLng ?? 0,
        address: address ?? '',
      }))
    }
  }, [restaurantId, restaurantName, dispatch])

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
          if (
            ['MENU_ITEM_UPDATED', 'MENU_ITEM_ADDED', 'MENU_ITEM_DELETED', 'MENU_ITEMS_BULK_UPDATED'].includes(data.type)
          ) {
            if (restaurantId && restaurantName) {
              dispatch(fetchMenu({
                restaurantId,
                restaurantName,
                restaurantLat: restaurantLat ?? 0,
                restaurantLng: restaurantLng ?? 0,
                address: address ?? '',
              }));
            }
            if (data.type === 'MENU_ITEM_UPDATED' && data.item && !data.item.is_available) {
              toast.error(`"${data.item.name}" is now out of stock`);
            } else if (data.type === 'MENU_ITEM_ADDED' && data.item?.name) {
              toast.success(`New item added: "${data.item.name}"`);
            } else if (data.type === 'MENU_ITEM_DELETED') {
              toast.error('A menu item was removed by the restaurant');
            }
          }
        } catch (err) {
          console.error('SSE menu event error:', err);
        }
      },
      onerror(err) {
        console.warn('SSE menu connection error:', err);
      }
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.error('SSE connection error:', err);
      }
    });

    return () => controller.abort();
  }, [restaurantId, restaurantName, restaurantLat, restaurantLng, address, dispatch]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div
          className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
        <p style={{ color: 'var(--color-text-muted)' }}>{t('Loading menu of')} {restaurantName}...</p>
      </div>
    )
  }

  if (error) {
    return (

      <>

        <div
          className="min-h-screen flex flex-col items-center justify-center gap-3"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <p className="text-lg" style={{ color: 'var(--color-error)' }}>{error}</p>
        </div>
      </>

    )
  }

  if (items.length === 0) {
    return (
      <>

        <div
          className="min-h-screen flex flex-col items-center justify-center"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >

          <p style={{ color: 'var(--color-text-muted)' }}>{t('Click a restaurant to load its menu.')}</p>
        </div>
      </>

    )
  }

  const applyPriceFilter = (menuItems: MenuItem[]) => {
    switch (priceFilter) {
      case 'under100':
        return menuItems.filter(item => item.price < 100)

      case 'under200':
        return menuItems.filter(item => item.price < 200)

      case 'above200':
        return menuItems.filter(item => item.price >= 200)

      default:
        return menuItems
    }
  }


  const isDrinkOrDessert = (item: MenuItem) => {
    const text = `${item.name} ${item.description}`.toLowerCase()
    return /\b(juice|shake|lassi|tea|coffee|soda|cooler|drink|smoothie|mocktail|beverage|water|mojito|chai|lemonade|sharbat|thandai|buttermilk|sambharam|falooda|ice cream|kulfi|cake|pastry|dessert|brownie|payasam|halwa|gulab jamun|rasgulla|pudding|sundae|sweet|waffle)\b/i.test(text)
  }

  const isDiscounted = (item: MenuItem) => Number(item.discount || 0) > 0

  const availableItems = items.filter(i => i.is_available !== false)
  const flatDiscount = (() => {
    if (availableItems.length < 2) return 0
    const discounts = availableItems.map(i => Number(i.discount || 0))
    const first = discounts[0]
    if (first > 0 && discounts.every(d => d === first)) return first
    return 0
  })()

  const excludeDiscounted = (i: MenuItem) => flatDiscount > 0 ? false : isDiscounted(i)

  const allDrinkAndDessertItems = items.filter(i => isDrinkOrDessert(i) && !excludeDiscounted(i))
  const allVeg = items.filter(i => i.veg && !isDrinkOrDessert(i) && !excludeDiscounted(i))
  const allNonVeg = items.filter(i => !i.veg && !isDrinkOrDessert(i) && !excludeDiscounted(i))

  const sortByDiscount = (list: MenuItem[]) => {
    return [...list].sort((a, b) => {
      const discA = Number(a.discount || 0)
      const discB = Number(b.discount || 0)
      if (discA > 0 && discB === 0) return -1
      if (discA === 0 && discB > 0) return 1
      return discB - discA
    })
  }

  const discountedItems = sortByDiscount(applyPriceFilter(items.filter(i => isDiscounted(i))).filter(i => {
    if (filter === 'veg') return i.veg
    if (filter === 'nonveg') return !i.veg
    return true
  }))

  const vegItems = filter === 'nonveg' ? [] : applyPriceFilter(allVeg)
  const nonVegItems = filter === 'veg' ? [] : applyPriceFilter(allNonVeg)
  const drinkAndDessertItems = applyPriceFilter(allDrinkAndDessertItems).filter(i => {
    if (filter === 'veg') return i.veg
    if (filter === 'nonveg') return !i.veg
    return true
  })

  const handleCardClick = async (item: MenuItem) => {
    if (item.is_available === false) {
      toast.error(`${item.name} is currently out of stock`)
      return
    }
    const hasDiscount = Boolean(item.discount && item.discount > 0)
    const effectivePrice = hasDiscount
      ? Math.round(Number(item.price) * (1 - (item.discount || 0) / 100))
      : Number(item.price)

    const accessToken = localStorage.getItem('accessToken')

    try {
      if (accessToken && restaurantId) {
        await dispatch(addToCartAPI({
          menuItemId: item.id,
          restaurantId,
          quantity: 1,
          name: item.name,
          price: effectivePrice,
          description: item.description,
          veg: item.veg,
          restaurantName: restaurantName ?? '',
        })).unwrap()
      } else {
        dispatch(addToCart({ item: { ...item, price: effectivePrice }, restaurantName: restaurantName ?? '', restaurantId: restaurantId ?? 0 }))
      }

      toast.success(`${item.name} ${t('added to cart!')}`)
    } catch (err) {
      console.error('Add to cart failed:', err)
      toast.error(typeof err === 'string' ? err : t('Failed to add item to cart'))
    }
  }

  return (
    <>
      <div
        className="min-h-screen px-6 md:px-16 py-12 bg-"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="mb-10">

          <h1 className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--color-text)' }}>
            {restaurantName}
          </h1>
          <span className='opacity-35'>{address}</span>
          {restaurantLat && restaurantLng && (
            <div className="mt-8 mb-10">
              <RestaurantMap
                lat={restaurantLat}
                lng={restaurantLng}
                name={restaurantName ?? 'Restaurant'}
              />
            </div>
          )}

          <div className="mt-3 h-[2px] w-16" style={{ backgroundColor: 'var(--color-primary)' }} />
        </div>

        {flatDiscount > 0 && (
          <div
            className="mb-8 relative overflow-hidden rounded-2xl shadow-lg"
            style={{ background: 'linear-gradient(120deg, #f59e0b 0%, #ea580c 55%, #dc2626 100%)' }}
          >
            <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-black/10" />

            <div className="relative z-10 flex items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-3.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-300" />
                </span>
                <p className="text-white font-black text-2xl leading-none tracking-tight">
                  Flat {flatDiscount}% off on every food you order today
                </p>
              </div>

              <div className="shrink-0 relative">
                <div className="w-[72px] h-[72px] rounded-full bg-white flex flex-col items-center justify-center shadow-2xl">
                  <span className="text-orange-500 font-black text-3xl leading-none">{flatDiscount}</span>
                  <span className="text-orange-400 font-bold text-[10px] uppercase tracking-wider">% off</span>
                </div>
                <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 5px rgba(255,255,255,0.2)' }} />
              </div>
            </div>
          </div>
        )}



        <div
          className="top-0 z-30 py-3.5 px-4 mb-8 rounded-2xl flex flex-wrap items-center justify-between gap-4 border shadow-sm transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <div className="flex items-center gap-6 flex-wrap">

            <label
              onClick={() => setFilter(filter === 'veg' ? 'all' : 'veg')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                <span
                  className="w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: '#16a34a' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                </span>
                {t('Veg Only')}
              </span>
              <div
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out p-0.5 ${filter === 'veg' ? 'bg-[#16a34a]' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${filter === 'veg' ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
              </div>
            </label>

            <label
              onClick={() => setFilter(filter === 'nonveg' ? 'all' : 'nonveg')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                <span
                  className="w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: '#881337' }}
                >
                  <span
                    className="w-2 h-2 bg-[#881337]"
                    style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
                  />
                </span>
                {t('Non-Veg Only')}
              </span>
              <div
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out p-0.5 ${filter === 'nonveg' ? 'bg-[#881337]' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${filter === 'nonveg' ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
              </div>
            </label>

            <div className="h-4 w-px opacity-20 hidden sm:block" style={{ backgroundColor: 'var(--color-text)' }} />

            <div className="relative flex items-center">
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)}
                className="appearance-none text-xs font-semibold px-3.5 py-1.5 pr-8 rounded-xl border outline-none cursor-pointer transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="all" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)' }}>{t('All Prices')}</option>
                <option value="under100" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)' }}>{t('Under ₹100')}</option>
                <option value="under200" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)' }}>{t('Under ₹200')}</option>
                <option value="above200" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)' }}>{t('₹200 & Above')}</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 opacity-60" style={{ color: 'var(--color-text)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {(filter !== 'all' || priceFilter !== 'all') && (
            <button
              onClick={() => {
                setFilter('all');
                setPriceFilter('all');
              }}
              className="text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-none bg-transparent"
              style={{ color: 'var(--color-primary)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {t('Reset Filters')}
            </button>
          )}
        </div>

        {aiActive && aiMatchedIds.size > 0 && (() => {
          let matchedInMenu = items.filter(i => aiMatchedIds.has(i.id) && i.is_available !== false)
          if (filter === 'veg') matchedInMenu = matchedInMenu.filter(i => i.veg)
          if (filter === 'nonveg') matchedInMenu = matchedInMenu.filter(i => !i.veg)
          matchedInMenu = applyPriceFilter(matchedInMenu)
          if (matchedInMenu.length === 0) return null
          return (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-orange-500 flex items-center gap-1.5">
                  Your search matches...
                </span>
                <div className="flex-1 h-px bg-orange-200" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {matchedInMenu.map(item => (
                  <MenuCard
                    key={`ai-${item.id}`}
                    item={item}
                    onClick={() => handleCardClick(item)}
                    aiHighlight={true}
                  />
                ))}
              </div>
            </section>
          )
        })()}

        {discountedItems.length > 0 && !flatDiscount && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                {t('Special Offers & Discounts')}
              </span>
              <div className="flex-1 h-px bg-amber-500/30" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {discountedItems.map(item => (
                <MenuCard key={`disc-${item.id}`} item={item}
                  onClick={() => handleCardClick(item)}
                  suppressRibbon={false}
                />
              ))}
            </div>
          </section>
        )}

        {vegItems.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                {t('Vegetarian')}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {vegItems.map(item => (
                <MenuCard key={item.id} item={item}
                  onClick={() => handleCardClick(item)}
                  suppressRibbon={flatDiscount > 0}
                />
              ))}
            </div>
          </section>
        )}

        {nonVegItems.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                {t('Non Vegetarian')}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {nonVegItems.map(item => (
                <MenuCard key={item.id} item={item}
                  onClick={() => handleCardClick(item)}
                  suppressRibbon={flatDiscount > 0}
                />
              ))}
            </div>
          </section>
        )}

        {drinkAndDessertItems.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                {t('Drinks & Desserts')}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {drinkAndDessertItems.map(item => (
                <MenuCard key={item.id} item={item}
                  onClick={() => handleCardClick(item)}
                  suppressRibbon={flatDiscount > 0}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>

  )
}
interface MenuCardProps {
  item: MenuItem
  onClick: () => void
  aiHighlight?: boolean
  suppressRibbon?: boolean
}
function MenuCard({ item, onClick, aiHighlight = false, suppressRibbon = false }: MenuCardProps) {
  const outOfStock = item.is_available === false
  const discountVal = Number(item.discount || 0)
  const hasDiscount = discountVal > 0
  const discountedPrice = hasDiscount
    ? Math.round(Number(item.price) * (1 - discountVal / 100))
    : Number(item.price)
  const savings = hasDiscount ? Math.round(Number(item.price) - discountedPrice) : 0

  return (
    <div
      className={`relative overflow-hidden rounded-2xl flex flex-col justify-between p-5 transition-all duration-200 border h-full ${aiHighlight
        ? 'border-orange-400 ring-1 ring-orange-300 shadow-orange-100 shadow-md'
        : hasDiscount && !outOfStock
          ? 'border-amber-300 dark:border-amber-800/80 shadow-2xs'
          : 'border-transparent'
        } ${outOfStock ? 'opacity-60' : ''}`}
      style={{ backgroundColor: 'var(--color-bg-card)' }}
      onMouseEnter={e => !outOfStock && (e.currentTarget.style.backgroundColor = 'var(--color-bg-card-hover)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-card)')}
    >
      {hasDiscount && !suppressRibbon && (
        <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-br-xl shadow-xs pointer-events-none select-none z-10 flex items-center gap-1">
          <Tag className="w-3 h-3" />
          {discountVal}% OFF
        </div>
      )}

      <div className={`flex items-start justify-between gap-4 ${hasDiscount ? 'pt-3' : ''}`}>
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0"
              style={{ borderColor: item.veg ? '#16a34a' : '#881337' }}
              title={item.veg ? 'Vegetarian' : 'Non-Vegetarian'}
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
            <h3
              className="font-semibold text-base line-clamp-1"
              style={{ color: 'var(--color-text)' }}
              title={item.name}
            >
              {item.name}
            </h3>
          </div>
          <p
            className="text-sm leading-relaxed line-clamp-2 min-h-[40px]"
            style={{ color: 'var(--color-text-muted)' }}
            title={item.description || ''}
          >
            {item.description || '—'}
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0">
          {hasDiscount ? (
            <>
              <span className="text-xs line-through text-gray-400 font-semibold">
                ₹{item.price}
              </span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{discountedPrice}
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                Save ₹{savings}
              </span>
            </>
          ) : (
            <span className="text-base font-bold whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
              ₹{item.price}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-start">
        <button
          onClick={onClick}
          disabled={outOfStock}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${outOfStock
            ? 'opacity-40 cursor-not-allowed'
            : 'cursor-pointer hover:opacity-80 active:scale-95'
            }`}
          style={{
            backgroundColor: outOfStock ? 'var(--color-border)' : 'var(--color-primary)',
            color: outOfStock ? 'var(--color-text-muted)' : '#fff',
          }}
        >
          {outOfStock ? 'Out of Stock' : '+ Add to Cart'}
        </button>
      </div>
    </div>
  )
}