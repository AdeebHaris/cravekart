
import { createSlice, createAsyncThunk  } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import apiClient from '../../../Services/apiClient'
import { API_ENDPOINTS } from '../../../config/api'
import toast from 'react-hot-toast'

interface CartItem {
  id: number
  cartItemId?:number
  name: string
  price: number
  description: string
  veg: boolean
  quantity: number
  restaurantName:  string
  restaurantId?: number
  is_available?: boolean
}

const savedCart = localStorage.getItem('cart')
const initialState = savedCart ? JSON.parse(savedCart) : { items: []}


export const loadCart = createAsyncThunk(
  'cart/loadCart',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get(API_ENDPOINTS.CART)
      return data.items.map((row: any) => ({
        cartItemId: row.id,
        id: row.menu_item_id,
        name: row.item_name,
        description: row.description,
        veg: row.veg,
        quantity: Number(row.quantity),
        price: Number(row.price),
        restaurantId: row.restaurant_id,
        restaurantName: row.restaurant_name,
        is_available: row.is_available === false ? false : true,
      }))
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load cart')
    }
  }
)

export const addToCartAPI = createAsyncThunk(
  'cart/addToCartAPI',
  async (
    payload: {
      menuItemId: number
      restaurantId: number
      quantity: number
      name: string
      price: number
      description: string
      veg: boolean
      restaurantName: string
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.ADD_TO_CART, {
        menuItemId: payload.menuItemId,
        restaurantId: payload.restaurantId,
        quantity: payload.quantity,
      })
      return {
        cartItemId: data.cartItem.id,
        id: payload.menuItemId,
        name: payload.name,
        price: payload.price,
        description: payload.description,
        veg: payload.veg,
        quantity: payload.quantity,
        restaurantId: payload.restaurantId,
        restaurantName: payload.restaurantName,
      } as CartItem
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to add to cart')
    }
  }
)

export const updateQuantityAPI = createAsyncThunk(
  'cart/updateQuantityAPI',
  async (
    { cartItemId, quantity, menuItemId, restaurantName }:
    { cartItemId: number; quantity: number; menuItemId: number; restaurantName: string },
    { rejectWithValue }
  ) => {
    try {
      await apiClient.put(
        API_ENDPOINTS.UPDATE_CART_ITEM_QUANTITY.replace(':cartItemId', String(cartItemId)),
        { quantity }
      )
      return { menuItemId, quantity, restaurantName }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to update quantity')
    }
  }
)
export const removeFromCartAPI = createAsyncThunk(
  'cart/removeFromCartAPI',
  async (
    { cartItemId, menuItemId, restaurantName }:
    { cartItemId: number; menuItemId: number; restaurantName: string },
    { rejectWithValue }
  ) => {
    try {
      await apiClient.delete(
        API_ENDPOINTS.REMOVE_FROM_CART.replace(':cartItemId', String(cartItemId))
      )
      return { menuItemId, restaurantName }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to remove item')
    }
  }
)

export const clearCartAPI = createAsyncThunk(
  'cart/clearCartAPI',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.delete(API_ENDPOINTS.CLEAR_CART)
      return null
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to clear cart')
    }
  }
)

export const mergeGuestCart = createAsyncThunk(
  'cart/mergeGuestCart',
  async (guestItems: CartItem[], { dispatch, rejectWithValue }) => {
    try {
      for (const item of guestItems) {
        await apiClient.post(API_ENDPOINTS.ADD_TO_CART, {
          menuItemId: item.id,
          restaurantId: item.restaurantId ?? 0,
          quantity: item.quantity,
        })
      }
      await dispatch(loadCart())
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to merge cart')
    }
  }
)

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{
    item: Omit<CartItem, 'quantity' | 'restaurantName' | 'restaurantId' | 'cartItemId'>,
    restaurantName: string,
    restaurantId: number
  }>) => {
    const existing = state.items.find(
      i => i.id === action.payload.item.id && i.restaurantName === action.payload.restaurantName
    )
    if (existing) {
      existing.quantity += 1
    } else {
      state.items.push({
        ...action.payload.item,
        restaurantName: action.payload.restaurantName,
        restaurantId: action.payload.restaurantId,
        quantity: 1
      })
    }
    localStorage.setItem('cart', JSON.stringify(state))
  },
    updateQuantity: (state, action: PayloadAction<{ id: number; quantity: number; restaurantName: string }>) => {
      const item = state.items.find(i => i.id === action.payload.id && i.restaurantName === action.payload.restaurantName)
      if (item) {
        item.quantity = action.payload.quantity
      }
      localStorage.setItem('cart', JSON.stringify(state)) 
      
    },
    removeFromCart: (state, action: PayloadAction<{ id: number; restaurantName: string }>) => {
      const item = state.items.find(i=>i.id ===action.payload.id && i.restaurantName === action.payload.restaurantName)
        if (item) {
        toast.error(`${item.name} got removed from cart`, {   
          style: {
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)'
          },
          iconTheme: {
            primary: '#dc2626',
            secondary: '#fff'
          }
        })

      }
      state.items = state.items.filter(i => !(i.id === action.payload.id && i.restaurantName === action.payload.restaurantName))

      localStorage.setItem('cart', JSON.stringify(state)) 
    },
    clearCartLocal: (state) => {
      state.items = []
      localStorage.removeItem('cart')
    },
  },
  extraReducers: (builder) => {
  builder.addCase(loadCart.fulfilled, (state, action) => {
    state.items = action.payload
    localStorage.setItem('cart', JSON.stringify(state))
  })
  builder.addCase(addToCartAPI.fulfilled, (state, action) => {
    const newItem = action.payload
    const existing = state.items.find(
    i => i.id === newItem.id && i.restaurantId === newItem.restaurantId   //
  ) 
    if (existing) {
      existing.quantity += newItem.quantity
      existing.cartItemId = newItem.cartItemId 
    } else {
      state.items.push(newItem)
    }
    localStorage.setItem('cart', JSON.stringify(state))
  })
  builder.addCase(updateQuantityAPI.fulfilled, (state, action) => {
    const { menuItemId, quantity, restaurantName } = action.payload
    const item = state.items.find(
      i => i.id === menuItemId && i.restaurantName === restaurantName
    )
    if (item) {
      item.quantity = quantity
    }
    localStorage.setItem('cart', JSON.stringify(state))
  })
  builder.addCase(removeFromCartAPI.fulfilled, (state, action) => {
    const { menuItemId, restaurantName } = action.payload
    state.items = state.items.filter(
      i => !(i.id === menuItemId && i.restaurantName === restaurantName)
    )
    localStorage.setItem('cart', JSON.stringify(state))
  })
  builder.addCase(clearCartAPI.fulfilled, (state) => {
    state.items = []
    localStorage.removeItem('cart')
  })
},
})


export const { addToCart, updateQuantity, removeFromCart, clearCartLocal } = cartSlice.actions
export default cartSlice.reducer