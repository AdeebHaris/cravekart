import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '../../../Services/apiClient'
import { API_ENDPOINTS } from '../../../config/api'


export interface Restaurant {
  id: number
  place_id: string
  name: string
  address: string
  rating: number | null
  latitude: number
  longitude: number
  is_open: boolean | null
  photo_url: string | null
}


export const loadRestaurants = createAsyncThunk(
  'restaurants/load',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get(API_ENDPOINTS.GET_ALL_RESTAURANTS)
      const raw: any[] = Array.isArray(data) ? data : (data.restaurants || [])
      return raw.map(r => ({
        ...r,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        rating: r.rating !== null ? Number(r.rating) : null,
      }))
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to load restaurants')
    }
  }
)

export const searchRestaurants = createAsyncThunk(
  'restaurants/search',
  async (query: string, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get(
        `${API_ENDPOINTS.SEARCH_RESTAURANTS}?q=${encodeURIComponent(query)}`
      )
      const raw: any[] = Array.isArray(data) ? data : []
      return raw.map(r => ({
        ...r,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        rating: r.rating !== null ? Number(r.rating) : null,
      }))
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to search restaurants')
    }
  }
)

interface RestaurantState{
    list: Restaurant[]
    loading: boolean
    error: string | null
}


const initialState: RestaurantState = {
    list: [],
    loading: false,
    error: null,
}

const restaurantSlice = createSlice({
    name:'restaurants',
    initialState,
    reducers:{},
    extraReducers:(builder) =>{
        builder
        .addCase(loadRestaurants.pending, (state)=>{
            state.loading = true
            state.error = null
        })
        .addCase(loadRestaurants.fulfilled, (state,action) =>{
            state.loading = false
            state.list = action.payload
        })
        .addCase(loadRestaurants.rejected, (state,action)=>{
            state.loading = false
            state.error = action.payload as string
        })
        .addCase(searchRestaurants.pending, (state) => {
          state.loading = true
          state.error = null
        })
        .addCase(searchRestaurants.fulfilled, (state, action) => {
          state.loading = false
          state.list = action.payload
        })
        .addCase(searchRestaurants.rejected, (state, action) => {
          state.loading = false
          state.error = action.payload as string
        })
    }
})

export default restaurantSlice.reducer
