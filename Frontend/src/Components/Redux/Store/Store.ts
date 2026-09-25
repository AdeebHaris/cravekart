import { configureStore } from "@reduxjs/toolkit"
import restaurantReducer from "../Slices/restaurantSlice"
import menuReducer from '../Slices/menuSlice'
import cartReducer from '../Slices/cartSlice' 
import authReducer from '../Slices/authSlice';

export const store = configureStore({
  reducer: {
    restaurants: restaurantReducer,
    menu: menuReducer,
    cart: cartReducer,
    auth: authReducer
  },
})


export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch