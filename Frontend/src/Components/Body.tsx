import { Search, Utensils, Star } from "lucide-react";
import { useAppSelector } from "./Hooks/hooks";
import { useEffect, useState } from "react"
import { loadRestaurants } from "../Components/Redux/Slices/restaurantSlice"
import { useAppDispatch } from "./Hooks/hooks"
import { fetchMenu } from './Redux/Slices/menuSlice'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DARK_BG, LIGHT_BG, FOOD_CATEGORIES } from "./constants";
import { useTheme } from "../Context/ThemeContext"
import { RestaurantCardSkeleton } from "./ui/skeleton"


export default function Body() {

  const { i18n } = useTranslation()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isDark } = useTheme()
  const { list, loading } = useAppSelector((state) => state.restaurants)


  const [bgImage, setBgImage] = useState<string>(
    () => localStorage.getItem('bgImage') ?? (isDark ? DARK_BG : LIGHT_BG)
  )



  const popularRestaurants = useAppSelector((state) =>
    state.restaurants.list.filter((r) => r.rating > 4)
  )

  const handleSearchClick = () => {
    navigate('/restaurant?focus=true')
  }

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/restaurant?q=${encodeURIComponent(categoryName)}`)
  }

  useEffect(() => {
    dispatch(loadRestaurants())
    const next = isDark ? DARK_BG : LIGHT_BG
    localStorage.setItem('bgImage', next)
    setBgImage(next)

    const token = localStorage.getItem('accessToken');
    const sseUrl = `${import.meta.env.VITE_API_BASE_URL}/orders/events${token ? `?token=${token}` : ''}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (['RESTAURANT_CREATED', 'RESTAURANT_UPDATED', 'RESTAURANT_DELETED'].includes(data.type)) {
          dispatch(loadRestaurants());
        }
      } catch (err) {
        console.error('Error parsing SSE event in Body:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [dispatch, isDark])

  return (
    <div style={{ color: 'var(--color-text)' }}>


      <img
        src={bgImage}
        className="w-screen h-screen absolute inset-0 z-[-1] object-cover bg-colr"
      />

      <section className="min-h-[65vh] flex flex-col items-center justify-center text-center px-6">
        <h1
          className={`font-bold mb-6 z-0 text-foreground drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] light:drop-shadow-[0_2px_10px_rgba(255,255,255,0.95)] ${i18n.language === 'ml' ? 'text-3xl sm:text-4xl md:text-5xl' : 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl'}`}
        >
          {t('Crave it. Cart it. Get it.')}
        </h1>
      </section>


      <section className="scale-75 lg:scale-100 flex justify-center px-6 mb-16 z-0">
        <div
          className="flex items-center rounded-full px-5 py-3 w-full max-w-2xl z-0 shadow-2xl bg-gray-900/90 light:bg-white/90 border border-gray-800 light:border-gray-200 backdrop-blur-md"
        >
          <Search className="z-0 text-gray-500 light:text-gray-400" />
          <input onClick={handleSearchClick}
            type="text"
            placeholder={t("Search restaurants, dishes and locations...")}
            className="w-full outline-none px-3 bg-transparent text-white light:text-gray-900 placeholder-gray-500 light:placeholder-gray-400"
            style={{ fontSize: i18n.language === 'ml' ? '12px' : '18px' }}
          />
        </div>
      </section>


      <section className="px-4 sm:px-10 mb-16 relative z-0 overflow-visible">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-foreground">
          {t('Choose your meal')}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3 sm:gap-4 mb-3">
          {FOOD_CATEGORIES.map((category) => (
            <div
              key={category.name}
              className="flex flex-col items-center justify-center cursor-pointer group py-2"
              onClick={() => handleCategoryClick(category.name)}
            >
              <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-sm bg-gray-800 light:bg-gray-100">
                <img
                  src={category.image}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  alt={category.name}
                />
              </div>
              <span className="mt-1.5 text-xs sm:text-sm font-semibold text-center truncate max-w-full text-foreground">
                {t(category.name)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-10 mb-20 relative z-10">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-8 text-foreground">
          {t('Top Rated Restaurants')}
        </h2>

        {loading ? (
          <div className="flex flex-row gap-4 overflow-x-auto pb-4 pt-6 scrollbar-hide">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-84">
                <RestaurantCardSkeleton />
              </div>
            ))}
          </div>
        ) : popularRestaurants.length === 0 ? (
          <p className="text-gray-400 light:text-gray-500">{t('No top rated restaurants found.')}</p>
        ) : (
          <div className="flex flex-row gap-5 overflow-x-auto pb-4 pt-6 scrollbar-hide">
            {popularRestaurants.map((restaurant) => (
              <Link to='/menu' key={restaurant.place_id}>
                <div
                  onClick={() => dispatch(fetchMenu({ restaurantId: restaurant.id, restaurantName: restaurant.name, restaurantLat: restaurant.latitude, restaurantLng: restaurant.longitude, address: restaurant.address }))}
                  className="flex-shrink-0 w-72 cursor-pointer group"
                >
                  <div
                    className="rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-2xl shadow-lg flex flex-col h-[280px] bg-gray-900 light:bg-white border border-gray-800 light:border-gray-100"
                  >
                    <div className="relative h-44 w-full overflow-hidden">
                      {restaurant.photo_url ? (
                        <img
                          src={restaurant.photo_url}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-500 "
                          alt={restaurant.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 light:bg-gray-100">
                          <Utensils className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      {restaurant.rating && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{Number(restaurant.rating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold leading-snug line-clamp-2 text-foreground">
                            {restaurant.name}
                          </h3>
                          <svg className="w-4 h-4 shrink-0 mt-0.5 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed text-gray-400 light:text-gray-500">
                          {restaurant.address || 'Address not available'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </section>



      <footer
        className="py-10 text-center border-t border-gray-800 light:border-gray-200 text-gray-400 light:text-gray-500"
      >
        <h3 className="text-xl font-bold mb-3 text-foreground">
          {t('CraveKart')}
        </h3>
        <p>{t('Delivering happiness, one meal at a time.')}</p>
      </footer>
    </div>
  )
}