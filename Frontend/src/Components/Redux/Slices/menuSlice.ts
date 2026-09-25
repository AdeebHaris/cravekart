import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '../../../Services/apiClient'
import { API_ENDPOINTS } from '../../../config/api'


export interface MenuItem {
  id: number
  name: string
  price: number
  description: string
  veg: boolean
  is_available?: boolean
  discount?: number
}

interface MenuCache {
  [restaurantName: string]: MenuItem[]
}

interface MenuState {
  items: MenuItem[]
  loading: boolean
  error: string | null
  restaurantName: string | null
  address: string | null
  restaurantId: number | null
  restaurantLat: number | null
  restaurantLng: number | null
  cache: MenuCache  
}

const MENU_CACHE_KEY = 'menuCache'
const MENU_CONTEXT_KEY = 'menuContext'

interface MenuContext {
  restaurantName: string
  restaurantId: number
  restaurantLat: number
  restaurantLng: number
  address: string
}

const loadMenuCache = (): MenuCache => {
  try {
    localStorage.removeItem(MENU_CACHE_KEY)
    return {}
  } catch {
    return {}
  }
}

const saveMenuCache = (cache: MenuCache) => {
  localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(cache))
}

const loadMenuContext = (): Partial<MenuContext> => {
  try {
    const ctx = localStorage.getItem(MENU_CONTEXT_KEY)
    return ctx ? JSON.parse(ctx) : {}
  } catch {
    return {}
  }
}

const saveMenuContext = (ctx: MenuContext) => {
  localStorage.setItem(MENU_CONTEXT_KEY, JSON.stringify(ctx))
}

const savedContext = loadMenuContext()
const savedCache = loadMenuCache()

const initialState: MenuState = {
  items: savedContext.restaurantName ? (savedCache[savedContext.restaurantName] ?? []) : [],
  loading: false,
  error: null,
  restaurantName: savedContext.restaurantName ?? null,
  address: savedContext.address ?? null,
  restaurantId: savedContext.restaurantId ?? null,
  restaurantLat: savedContext.restaurantLat ?? null,
  restaurantLng: savedContext.restaurantLng ?? null,
  cache: savedCache,
}

export const fetchMenu = createAsyncThunk(
  'menu/fetchMenu',
  async (
    { restaurantId, restaurantName, restaurantLat, restaurantLng, address }:
    { restaurantId: number; restaurantName: string; restaurantLat: number; restaurantLng: number; address: string },
    { rejectWithValue, getState }
  ) => {
    try {
      console.log(` Fetching fresh menu for ${restaurantName} from backend`)
      const url = API_ENDPOINTS.MENU.replace(':restaurantName', encodeURIComponent(restaurantName))
      const { data } = await apiClient.get(url)
      const items: MenuItem[] = data ?? []
      return { items, restaurantId, restaurantName, restaurantLat, restaurantLng, address }
    } catch (err: any) {
      const state = getState() as { menu: MenuState }
      const cachedMenu = state.menu.cache[restaurantName]
      if (cachedMenu && cachedMenu.length > 0) {
        console.log(` Network error, falling back to cached menu for ${restaurantName}`)
        return { items: cachedMenu, restaurantId, restaurantName, restaurantLat, restaurantLng, address }
      }
      return rejectWithValue(err.response?.data?.error || 'Failed to load menu. Please try again.')
    }
  }
)

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
   
    clearRestaurantCache: (state, action) => {
      const restaurantName = action.payload
      delete state.cache[restaurantName]
      saveMenuCache(state.cache)
    },
    
    clearAllCache: (state) => {
      state.cache = {}
      state.items = []
      state.restaurantName = null
      localStorage.removeItem(MENU_CACHE_KEY)
      localStorage.removeItem(MENU_CONTEXT_KEY)
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending, (state, action) => {
        state.loading = true
        state.error = null
        state.restaurantName = action.meta.arg.restaurantName
        state.address = action.meta.arg.address
        state.restaurantId = action.meta.arg.restaurantId
        state.restaurantLat = action.meta.arg.restaurantLat
        state.restaurantLng = action.meta.arg.restaurantLng
      })
      .addCase(fetchMenu.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.restaurantName = action.payload.restaurantName
        state.address = action.payload.address
        state.restaurantId = action.payload.restaurantId
        state.restaurantLat = action.payload.restaurantLat
        state.restaurantLng = action.payload.restaurantLng
       
        state.cache[action.payload.restaurantName] = action.payload.items
        saveMenuCache(state.cache)

        saveMenuContext({
          restaurantName: action.payload.restaurantName,
          restaurantId: action.payload.restaurantId,
          restaurantLat: action.payload.restaurantLat,
          restaurantLng: action.payload.restaurantLng,
          address: action.payload.address,
        })
      })
      .addCase(fetchMenu.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { clearRestaurantCache, clearAllCache } = menuSlice.actions
export default menuSlice.reducer