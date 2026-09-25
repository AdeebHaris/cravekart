
import { createSlice} from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CustomUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  user: CustomUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoginDrawerOpen: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoginDrawerOpen: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: CustomUser; accessToken: string; refreshToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
    },
    openLoginDrawer: (state) => {
      state.isLoginDrawerOpen = true;
    },
    closeLoginDrawer: (state) => {
      state.isLoginDrawerOpen = false;
    },
  },
});

export const { setCredentials, clearCredentials, openLoginDrawer, closeLoginDrawer } = authSlice.actions;
export default authSlice.reducer;