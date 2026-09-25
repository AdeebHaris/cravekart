import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from "react-redux"
import { store } from './Components/Redux/Store/Store'
import { BrowserRouter } from 'react-router-dom'
import Auth0ProviderWithNavigate from '../src/Autho0ProviderWithNavigate.tsx'
import { ThemeProvider } from './Context/ThemeContext.tsx'
import './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <Auth0ProviderWithNavigate>
        <Provider store={store}>
          <App />
        </Provider>
      </Auth0ProviderWithNavigate>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)