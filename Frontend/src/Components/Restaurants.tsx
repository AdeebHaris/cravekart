
import { useAppSelector } from "./Hooks/hooks"
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch } from "./Hooks/hooks"
import { fetchMenu } from './Redux/Slices/menuSlice'
import { Search, Utensils, Star } from "lucide-react";
import { useState, useEffect, useRef, useMemo, type ChangeEvent } from 'react'
import { loadRestaurants } from "../Components/Redux/Slices/restaurantSlice"
import apiClient from '../Services/apiClient'
import { API_ENDPOINTS } from '../config/api'
import { useTranslation } from 'react-i18next'
import { RestaurantCardSkeleton } from "./ui/skeleton"

interface MatchedItem {
  id: number
  name: string
  price: number
  veg: boolean
}
interface AIRestaurant {
  id: number
  name: string
  photo_url: string | null
  rating: number
  address: string
  matchedItems: MatchedItem[]
}
interface AIResult {
  summary: string
  restaurants: AIRestaurant[]
}

export default function Restaurants() {


  const { t } = useTranslation()
  const navigate = useNavigate()
  const { list, loading, error } = useAppSelector((state) => state.restaurants)


  const location = useLocation()

  const dispatch = useAppDispatch()

  const [searchValue, setSearchValue] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const query = params.get('q')
    if (query) return decodeURIComponent(query).toLowerCase()
    return sessionStorage.getItem('restaurants_search_query') || ''
  })
  const [isAiMode, setIsAiMode] = useState(false)
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const isFirstRun = useRef(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    dispatch(loadRestaurants())
  }, [dispatch])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const query = params.get('q')
    if (query) {
      const qDecoded = decodeURIComponent(query).toLowerCase()
      setSearchValue(qDecoded)
      sessionStorage.setItem('restaurants_search_query', qDecoded)
    }
    if (params.get('focus') === 'true') {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [location.search])

  useEffect(() => {
    if (searchValue.trim() === '') {
      setIsAiMode(false)
      setAiResult(null)
      sessionStorage.removeItem('restaurants_search_query')
      dispatch(loadRestaurants())
      return
    }

    sessionStorage.setItem('restaurants_search_query', searchValue.trim())

    const delay = isFirstRun.current ? 0 : 500
    isFirstRun.current = false

    const handle = setTimeout(async () => {
      try {
        setAiLoading(true)
        const { data } = await apiClient.post(API_ENDPOINTS.AI_SEARCH_MENU, {
          query: searchValue.trim()
        })
        setAiResult(data)
        setIsAiMode(true)
      } catch (err) {
        console.error('AI search failed:', err)
        setIsAiMode(false)
      } finally {
        setAiLoading(false)
      }
    }, delay)

    return () => clearTimeout(handle)
  }, [searchValue, dispatch])

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }


  const ITEMS_PER_PAGE = 9;
  const initialPage = parseInt(sessionStorage.getItem('restaurants_page') || '1', 10);
  const [currentPage, setCurrentPage] = useState<number>(isNaN(initialPage) ? 1 : initialPage);

  const prevSearchRef = useRef(searchValue);
  useEffect(() => {
    if (prevSearchRef.current !== searchValue) {
      prevSearchRef.current = searchValue;
      setCurrentPage(1);
      sessionStorage.setItem('restaurants_page', '1');
    }
  }, [searchValue]);

  const activeList = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return list;

    const directMatches = list.filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q))
    );

    if (!isAiMode || !aiResult || !aiResult.restaurants) {
      return directMatches;
    }

    const aiList = aiResult.restaurants;
    const existingIds = new Set(aiList.map(r => r.id ?? (r as any).place_id));

    const combined = [...aiList];
    for (const r of directMatches) {
      const idKey = r.id ?? (r as any).place_id;
      if (!existingIds.has(idKey)) {
        existingIds.add(idKey);
        combined.push(r as any);
      }
    }

    return combined;
  }, [searchValue, isAiMode, aiResult, list]);
  const totalPages = Math.max(1, Math.ceil(activeList.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const displayedRestaurants = activeList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (error) return <p className="text-red-400">{t('Error:')} {error}</p>;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    sessionStorage.setItem('restaurants_page', String(page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleRestaurantClick = (restaurant: any) => {
    dispatch(fetchMenu({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantLat: restaurant.latitude ?? 0,
      restaurantLng: restaurant.longitude ?? 0,
      address: restaurant.address ?? ''
    }))
    if (isAiMode && searchValue.trim()) {
      navigate(`/menu?q=${encodeURIComponent(searchValue.trim())}`)
    } else {
      navigate('/menu')
    }
  }

  return (
    <>
      <div className="flex flex-col items-center px-4 sm:px-6 py-6 sm:py-10 max-w-7xl mx-auto w-full">
        <div
          className="flex items-center rounded-full px-5 py-3 w-full max-w-2xl shadow-xl"
          style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)' }}
        >
          {aiLoading ? (
            <span className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <Search style={{ color: 'var(--color-input-placeholder)' }} />
          )}
          <input
            ref={searchInputRef}
            onChange={handleSearch}
            value={searchValue}
            type="text"
            placeholder="Search dishes, cuisines or taste"
            className="w-full outline-none px-3"
            style={{ backgroundColor: 'transparent', color: 'var(--color-input-text)' }}
          />
          {searchValue && (
            <button
              onClick={() => {
                setSearchValue('')
                setIsAiMode(false)
                setAiResult(null)
                sessionStorage.removeItem('restaurants_search_query')
                dispatch(loadRestaurants())
              }}
              className="shrink-0 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
        {isAiMode && searchValue.trim() && (
          <div className="w-full max-w-7xl mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 border border-orange-200">
            <span className="text-sm text-orange-700">
              {aiResult?.restaurants && aiResult.restaurants.length > 0
                ? aiResult.summary
                : `Showing search results for "${searchValue}"`}
            </span>
            <span className="ml-auto text-xs text-orange-500 font-bold">
              {activeList.length} restaurant{activeList.length !== 1 ? 's' : ''} found
            </span>
          </div>
        )}
        {activeList.length > 0 && (
          <div className="w-full flex justify-between items-center mt-6 text-xs sm:text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            <span>
              Showing <strong className="text-orange-500">{startIndex + 1}</strong> – <strong className="text-orange-500">{Math.min(startIndex + ITEMS_PER_PAGE, activeList.length)}</strong> of <strong style={{ color: 'var(--color-text)' }}>{activeList.length}</strong> restaurants
            </span>
            <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6 mt-4 pb-6 w-full">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <RestaurantCardSkeleton key={i} />
            ))
          ) : displayedRestaurants.length > 0 ? (
            displayedRestaurants.map((restaurant: any) => (
              <div
                key={restaurant.place_id ?? restaurant.id}
                className="w-full flex cursor-pointer"
                onClick={() => handleRestaurantClick(restaurant)}
              >
                <div
                  className="flex flex-col rounded-2xl w-full transition-all duration-300 hover:scale-[0.98] shadow-md hover:shadow-xl overflow-hidden"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-card)')}
                >
                  {restaurant.photo_url ? (
                    <img src={restaurant.photo_url} alt={restaurant.name} className="w-full h-32 sm:h-48 object-cover" />
                  ) : (
                    <div className="w-full h-32 sm:h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <Utensils className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="flex flex-col items-start gap-1 p-3 sm:p-4 w-full">
                    <div className="flex items-center justify-between w-full gap-1">
                      <span className="font-bold text-sm sm:text-base truncate flex-1" style={{ color: 'var(--color-text)' }}>
                        {restaurant.name}
                      </span>
                      <span style={{ color: 'var(--color-rating)' }} className="text-xs sm:text-sm font-semibold shrink-0 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                        {restaurant.rating}
                      </span>
                    </div>
                    <span className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                      {restaurant.address}
                    </span>
                    {isAiMode && restaurant.matchedItems && restaurant.matchedItems.length > 0 && (
                      <div className="mt-2 w-full border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
                        <p className="text-[11px] font-semibold text-orange-500 mb-1.5">
                          Your search matches...
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {restaurant.matchedItems.slice(0, 3).map((item: MatchedItem) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border font-medium"
                              style={{
                                backgroundColor: 'var(--color-input-bg)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)'
                              }}
                            >
                              {item.veg ? (
                                <span className="w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 border-green-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                </span>
                              ) : (
                                <span className="w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 border-red-700">
                                  <span
                                    className="w-1.5 h-1.5 bg-red-700"
                                    style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
                                  />
                                </span>
                              )}
                              <span>{item.name}</span>
                              <span style={{ color: 'var(--color-text-muted)' }}>· ₹{item.price}</span>
                            </span>
                          ))}
                          {restaurant.matchedItems.length > 3 && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
                              style={{
                                backgroundColor: 'var(--color-input-bg)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-muted)'
                              }}
                            >
                              +{restaurant.matchedItems.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center mt-10" style={{ color: 'var(--color-text-muted)' }}>
              {aiLoading
                ? 'Searching...'
                : `No restaurants or dishes found matching "${searchValue}"`}
            </p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6 mb-6 w-full flex-wrap">
            <button
              onClick={() => handlePageChange(Math.max(validPage - 1, 1))}
              disabled={validPage === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:text-orange-500 active:scale-95"
              style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Previous</span>
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${validPage === page
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/25 scale-105'
                    : 'bg-transparent border-gray-200 dark:border-gray-700 hover:border-orange-400 hover:text-orange-500'
                    }`}
                  style={validPage === page ? {} : { color: 'var(--color-text)' }}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(Math.min(validPage + 1, totalPages))}
              disabled={validPage === totalPages}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-orange-500/20 bg-orange-500 text-white border-none hover:bg-orange-600 active:scale-95"
            >
              <span>Next</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  )
}