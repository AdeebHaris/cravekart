import { useAuth0 } from "@auth0/auth0-react"
import { Link, useLocation } from 'react-router-dom'
import Themetoggle from './Themetoggle'
import { useAppSelector, useAppDispatch } from './Hooks/hooks'
import { closeLoginDrawer, openLoginDrawer } from './Redux/Slices/authSlice'
import { useTranslation } from 'react-i18next'
import { authService } from '../Services/authService'
import { clearCartLocal, loadCart, mergeGuestCart } from './Redux/Slices/cartSlice'
import { store } from './Redux/Store/Store'
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Drawer, DrawerClose, DrawerContent,
  DrawerTitle, DrawerTrigger,
} from "@/Components/ui/drawer"
import {
  Field, FieldGroup, FieldLabel, FieldSet,
} from "@/Components/ui/field"
import { Input } from "@/Components/ui/input"
import { Button } from "@/Components/ui/button"
import { CloseIcon, CartIcon, PasswordInput } from './header/HeaderIcons'
import { useTheme } from "../Context/ThemeContext"

interface AuthDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  switchText: string
  switchLabel: string
  onSwitch: () => void
  trigger?: React.ReactNode
  color?: "orange" | "teal"
  icon?: React.ReactNode
  children?: React.ReactNode
  submitLabel: string
  onSubmit?: () => void
}

function AuthDrawer({
  open, onOpenChange, title, switchText, switchLabel,
  onSwitch, trigger, color = "orange", icon, children, submitLabel, onSubmit
}: AuthDrawerProps) {
  const colors = {
    orange: {
      banner: "linear-gradient(135deg, var(--color-primary) 0%, #ea580c 100%)",
      btnBg: "var(--color-primary)",
    },
    teal: {
      banner: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      btnBg: "#059669",
    },
  }
  const c = colors[color]

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent className="p-0 overflow-hidden z-100 border-l shadow-2xl flex flex-col h-full sm:h-auto">
        <div
          className="px-6 pt-6 pb-8 text-white relative shadow-md shrink-0"
          style={{ background: c.banner }}
        >
          <div className="flex justify-between items-center mb-2">
            <DrawerClose asChild>
              <button className="rounded-full bg-white/20 hover:bg-white/30 text-white border-none h-8 w-8 flex items-center justify-center transition-colors cursor-pointer">
                <CloseIcon />
              </button>
            </DrawerClose>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mt-2 mb-4 shadow-sm">
            {icon}
          </div>
          <DrawerTitle className="text-white text-2xl font-bold tracking-tight">{title}</DrawerTitle>
          <p className="text-white/80 text-xs mt-1 font-medium">
            {switchText}{" "}
            <span
              className="text-white font-bold underline cursor-pointer hover:opacity-90"
              onClick={onSwitch}
            >
              {switchLabel}
            </span>
          </p>
        </div>
        <div className="px-6 pt-6 space-y-4 flex-1 overflow-y-auto scrollbar-hide">{children}</div>
        <div className="px-6 pb-6 pt-4 mt-auto shrink-0">
          <button
            onClick={onSubmit}
            className="w-full py-3.5 rounded-xl font-bold text-white cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] shadow-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: c.btnBg }}
          >
            {submitLabel}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}



export default function Header() {
  const dispatch = useAppDispatch()
  const { isDark } = useTheme()
  const isLoginDrawerOpen = useAppSelector((state) => state.auth.isLoginDrawerOpen)
  const [signupOpen, setSignupOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [signupForm, setSignupForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
  })


  const [customUser, setCustomUser] = useState<string | null>(
    authService.getCurrentUser()?.username ?? null
  )



  const { isAuthenticated: auth0Authenticated, loginWithRedirect, logout, user: auth0User, isLoading } = useAuth0()
  const handleLogin = () => loginWithRedirect()
  const handleLogout = async () => {
    if (auth0Authenticated) {
      dispatch(clearCartLocal())
      localStorage.removeItem('accessToken')
      logout({ logoutParams: { returnTo: window.location.origin } })
    } else {
      dispatch(clearCartLocal())
      localStorage.removeItem('accessToken')
      await authService.logout()
      toast.success('Logged out successfully')
    }
    setCustomUser(null)
  }

  const isAuthenticated = auth0Authenticated || !!customUser
  const displayName = auth0User?.given_name ?? auth0User?.name ?? customUser


  const resetLoginForm = () => setLoginForm({ username: '', password: '' })
  const resetSignupForm = () => setSignupForm({ first_name: '', last_name: '', username: '', email: '', password: '' })

  const handleLoginSubmit = async () => {
    if (!loginForm.username.trim() && !loginForm.password.trim()) {
      toast.error(t('Please enter username and password'))
      return
    }
    if (!loginForm.username.trim()) {
      toast.error(t('Please enter username'))
      return
    }
    if (!loginForm.password.trim()) {
      toast.error(t('Please enter password'))
      return
    }
    try {
      const guestItems = store.getState().cart.items

      const response = await authService.login(loginForm.username, loginForm.password)
      setCustomUser(response.user.username)
      resetLoginForm()

      if (guestItems.length > 0) {
        await dispatch(mergeGuestCart(guestItems)).unwrap()
        toast.success(`Welcome back, ${response.user.username}! Your cart items have been saved.`)
      } else {
        dispatch(loadCart())
        toast.success(`Welcome back, ${response.user.username}!`)
      }

      dispatch(closeLoginDrawer())
      setMenuOpen(false)
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Login failed. Please try again.'
      toast.error(msg)
      console.error('Login Failed:', error)
    }
  }

  const handleSignupSubmit = async () => {
    try {
      await authService.register(signupForm)
      resetSignupForm()
      setSignupOpen(false)
      toast.success('Account created! Please log in.')
      setTimeout(() => dispatch(openLoginDrawer()), 300)
    } catch (error: any) {
      const detail = error?.response?.data?.details?.[0]
      const msg = detail
        ? (detail.field && detail.field !== 'root' && !detail.message.toLowerCase().startsWith(detail.field.toLowerCase())
          ? `${detail.field}: ${detail.message}`
          : detail.message)
        : error?.response?.data?.error || 'Sign up failed. Please try again.'
      toast.error(msg)
      console.error('Signup Failed', error)
    }
  }

  const location = useLocation()
  const { t, i18n } = useTranslation()

  const cartCount: number = useAppSelector((state) =>
    state.cart.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
  )

  const navLinkStyle = (active: boolean) => ({
    padding: '6px 16px',
    borderRadius: '9999px',
    backgroundColor: active ? 'var(--color-primary)' : 'transparent',
    color: active ? (isDark ? '#000000' : '#ffffff') : 'var(--color-text)',
    fontSize: i18n.language === 'ml' ? '14px' : '16px',
    lineHeight: '1.25rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    transition: 'background-color 0.25s ease-in-out, color 0.25s ease-in-out, box-shadow 0.25s ease-in-out',
    boxShadow: active ? '0 4px 12px rgba(249, 115, 22, 0.35)' : 'none',
  })

  return (
    <div className="relative flex items-center px-4 sm:px-6 lg:px- py-3">


      <div className="shrink-0">
        <Link to='/' className="flex items-center gap-2.5">
          <img
            src="src/assets/2f15426f-6ef2-41a6-937d-49013145f964-removebg-preview.png"
            alt="Logo"
            className="w-16 sm:w-20 h-auto p-1 object-contain"
          />
          <span className="font-black text-2xl sm:text-3xl tracking-tight" style={{ color: 'var(--color-text)' }}>
            CraveKart
          </span>
        </Link>
      </div>


      <div className="flex lg:hidden items-center gap-3 ml-auto">
        <Link to="/cart">
          <CartIcon />
          {cartCount > 0 && (
            <span
              className="absolute top-12 right-29 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: 'red' }}
            >
              {cartCount}
            </span>
          )}
        </Link>
        <Themetoggle />
        <button
          onClick={() => setMenuOpen(true)}
          className="text-3xl cursor-pointer"
          style={{ color: 'var(--color-nav-text)' }}
        >
          ☰
        </button>
      </div>


      <div
        className="fixed inset-0 z-100"
        style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 300ms ease-in-out',
        }}
        onClick={() => setMenuOpen(false)}
      >
        <div
          className="mobile-menu-panel absolute right-0 top-0 w-80 h-full p-6 flex flex-col shadow-2xl overflow-y-auto scrollbar-hide"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            borderLeft: '1px solid var(--color-border)',
            fontSize: '16px',
            transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
            willChange: 'transform',
          }}
        >

          <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{t('Menu')}</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)'
              }}
            >
              ✕
            </button>
          </div>


          <div className="flex flex-col gap-2 mb-6">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-3 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-3"
              style={{
                fontSize: i18n.language === 'ml' ? '13px' : '15px',
                backgroundColor: location.pathname === '/' ? 'var(--color-nav-bg)' : 'var(--color-bg-card)',
                color: location.pathname === '/' ? '#ffffff' : 'var(--color-text)',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {t('Home')}
            </Link>
            {
              isAuthenticated ? (
                <Link
                  className="px-4 py-3 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-3"
                  to='/dashboard'
                  onClick={() => setMenuOpen(false)}
                  style={{
                    fontSize: i18n.language === 'ml' ? '13px' : '15px',
                    backgroundColor: location.pathname === '/dashboard' ? 'var(--color-nav-bg)' : 'var(--color-bg-card)',
                    color: location.pathname === '/dashboard' ? '#ffffff' : 'var(--color-text)',
                  }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                  {t('Dashboard')}
                </Link>
              ) : (
                <a
                  className="px-4 py-3 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-3"
                  onClick={() => { setMenuOpen(false); dispatch(openLoginDrawer()) }}
                  style={{
                    fontSize: i18n.language === 'ml' ? '13px' : '15px',
                    backgroundColor: location.pathname === '/dashboard' ? 'var(--color-nav-bg)' : 'var(--color-bg-card)',
                    color: location.pathname === '/dashboard' ? '#ffffff' : 'var(--color-text)',
                  }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                  {t('Dashboard')}
                </a>
              )
            }

            <Link
              to="/restaurant"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-3 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-3"
              style={{
                fontSize: i18n.language === 'ml' ? '13px' : '15px',
                backgroundColor: location.pathname === '/restaurant' ? 'var(--color-nav-bg)' : 'var(--color-bg-card)',
                color: location.pathname === '/restaurant' ? '#ffffff' : 'var(--color-text)',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
              {t('Restaurants')}
            </Link>
          </div>

          <div className="border-t mb-6" style={{ borderColor: 'var(--color-border)' }} />


          <div className="flex flex-col gap-3 mb-6">
            {isLoading ? (
              <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }} className="px-3">
                {t('Loading...')}
              </span>
            ) : isAuthenticated ? (
              <>
                <div
                  className="flex items-center gap-3 p-3 rounded-2xl border shadow-sm mb-2"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #ea580c 100%)', fontSize: '15px' }}
                  >
                    {(displayName ?? 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                      {displayName}
                    </span>
                    {auth0User?.email && (
                      <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {auth0User.email}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  title={t('Logout')}
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                  className="w-full py-3 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-95 shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, red 0%, red 100%)',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {t('Logout')}
                </button>
              </>
            ) : (
              <>
                <AuthDrawer
                  open={isLoginDrawerOpen}
                  onOpenChange={(open) => !open && dispatch(closeLoginDrawer())}
                  title={t('Log in')}
                  submitLabel={t('Log in')}
                  switchText={t('or')}
                  switchLabel={t('create an account')}
                  onSubmit={handleLoginSubmit}
                  onSwitch={() => { dispatch(closeLoginDrawer()); setTimeout(() => setSignupOpen(true), 300) }}
                  trigger={
                    <button
                      className="mx-3 py-2 rounded-lg font-semibold text-center bg-orange-500 hover:bg-orange-600 text-white transition cursor-pointer"
                      style={{ fontSize: i18n.language === 'ml' ? '12px' : '18px' }}
                      onClick={() => { setMenuOpen(false); dispatch(openLoginDrawer()) }}
                    >
                      {t('Sign in')}
                    </button>
                  }
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  }
                >
                  {/* Temporarily disabled
                    <Button
                      variant="outline"
                      className="w-full h-11 flex items-center justify-center gap-3 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors "
                      onClick={handleLogin}
                    >
                      <GoogleIcon />
                      <span className="font-medium">{t('Continue with Google')}</span>
                    </Button>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300 dark:border-gray-700" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-3 text-muted-foreground">{t('Or')}</span>
                      </div>
                    </div>
                    */}
                  <FieldSet className="w-full">
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="username-mobile">{t('Username')}</FieldLabel>
                        <Input id="username-mobile" value={loginForm.username} type="text" placeholder={t('Enter your username')} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="password-mobile">{t('Password')}</FieldLabel>
                        <PasswordInput id="password-mobile" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()} />
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                </AuthDrawer>

                <AuthDrawer
                  open={signupOpen}
                  onOpenChange={setSignupOpen}
                  title={t('Sign Up')}
                  switchText={t('or')}
                  switchLabel={t('login to your account')}
                  submitLabel={t('Sign Up')}
                  onSubmit={handleSignupSubmit}
                  onSwitch={() => { setSignupOpen(false); setTimeout(() => dispatch(openLoginDrawer()), 300) }}
                  color="teal"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="10" cy="8" r="4" />
                      <path d="M4 20c0-4 3.2-7 7-7" />
                      <line x1="19" y1="12" x2="19" y2="18" />
                      <line x1="16" y1="15" x2="22" y2="15" />
                    </svg>
                  }
                  trigger={
                    <button
                      className="mx-3 py-2 rounded-lg font-semibold text-center border border-gray-700 light:border-gray-200 text-foreground transition cursor-pointer"
                      style={{ color: 'var(--color-text)', fontSize: i18n.language === 'ml' ? '13px' : '16px' }}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t('Sign up')}
                    </button>
                  }
                >
                  {/* Temporarily disabled
                    <Button
                      variant="outline"
                      className="w-full h-11 flex items-center justify-center gap-3 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={handleLogin}
                    >
                      <GoogleIcon />
                      <span className="font-medium">{t('Continue with Google')}</span>
                    </Button>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300 dark:border-gray-700" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-3 text-muted-foreground">{t('Or')}</span>
                      </div>
                    </div>
                    */}
                  <FieldSet className="w-full">
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="username -mobile">{t('Username')}</FieldLabel>
                        <Input id="username-mobile" type="username" placeholder={t('Enter your username')} value={signupForm.username} onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel htmlFor="first-name-mobile">{t('First name')}</FieldLabel>
                          <Input id="first-name-mobile" type="text" placeholder={t('Enter First Name')} value={signupForm.first_name} onChange={(e) => setSignupForm({ ...signupForm, first_name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="last-name-mobile">{t('Last name')}</FieldLabel>
                          <Input id="last-name-mobile" type="text" placeholder={t('Enter Last Name')} value={signupForm.last_name} onChange={(e) => setSignupForm({ ...signupForm, last_name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                        </Field>
                      </div>
                      <Field>
                        <FieldLabel htmlFor="email-mobile">{t('Email')}</FieldLabel>
                        <Input id="email-mobile" type="email" placeholder={t('Enter Email')} value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="signup-password-mobile">{t('Password')}</FieldLabel>
                        <PasswordInput id="signup-password-mobile" placeholder="••••••••" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                </AuthDrawer>
              </>
            )}
          </div>

          <div className="mt-auto pt-4 border-t px-1" style={{ borderColor: 'var(--color-border)' }}>
            <p className="uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              {t('Language')}
            </p>
            <button
              onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ml" : "en")}
              className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl transition-all cursor-pointer border"
              style={{
                fontSize: i18n.language === 'ml' ? '13px' : '15px',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text)',
                borderColor: 'var(--color-border)',
              }}
            >
              <span className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold shrink-0 shadow-sm" style={{ color: 'var(--color-nav-text)', fontSize: '14px' }}>
                {i18n.language === "en" ? "മ" : "En"}
              </span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {i18n.language === "en" ? "മലയാളം" : "English"}
              </span>
            </button>
          </div>

        </div>
      </div>

      <ul
        className="
          hidden lg:flex
          absolute left-1/2 -translate-x-1/2
          items-center
          gap-1
          py-2 px-3
          rounded-full shadow-2xl
          max-w-[calc(100%-9rem)]
        "
        style={{ backgroundColor: 'var(--color-nav-bg)' }}
      >

        <li className="flex justify-center">
          <Link
            to='/'
            className="rounded-full hover:bg-white/10 transition-all duration-200"
            style={navLinkStyle(location.pathname === '/')}
          >
            {t('Home')}
          </Link>
        </li>

        <li className="flex justify-center">
          <Link
            to='/restaurant'
            className="rounded-full hover:bg-white/10 transition-all duration-200"
            style={navLinkStyle(location.pathname === '/restaurant')}
          >
            {t('Restaurants')}
          </Link>
        </li>

        {
          isAuthenticated ? (
            <li className="flex justify-center">
              <Link
                to='/dashboard'
                className="rounded-full hover:bg-white/10 transition-all duration-200"
                style={navLinkStyle(location.pathname === '/dashboard')}
              >
                {t('Dashboard')}
              </Link>
            </li>

          ) : (
            <li className="flex justify-center">
              <a
                className="rounded-full hover:bg-white/10 transition-all duration-200 cursor-pointer"
                style={navLinkStyle(false)}
                onClick={() => dispatch(openLoginDrawer())}
              >
                {t('Dashboard')}
              </a>
            </li>
          )
        }
        <li className="flex justify-center items-center min-w-[40px]">
          <Link to='/cart' className="relative inline-block">
            <CartIcon />
            {cartCount > 0 && (
              <span
                className="absolute -top-3 -right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: 'red' }}
              >
                {cartCount}
              </span>
            )}
          </Link>
        </li>

        <li className="flex justify-center min-w-[110px] max-w-[110px]">
          {isLoading ? (
            <span className="text-sm opacity-60" style={{ fontSize: '15px', lineHeight: '1.5rem' }}>
              {t('Loading...')}
            </span>
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2 max-w-[160px]">

              <button

                onClick={handleLogout}
                className="font-semibold px-3 py-1 rounded-full hover:opacity-90 transition whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-btn-bg)',
                  color: 'var(--color-btn-text)',
                  fontSize: i18n.language === 'ml' ? '10px' : '15px',
                  lineHeight: '1.5rem',
                }}
              >
                {t('Logout')}
              </button>
            </div>
          ) : (
            <div>

              <AuthDrawer
                open={isLoginDrawerOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    dispatch(closeLoginDrawer())
                    resetLoginForm()
                  }
                }}
                title={t('Log in')}
                switchText={t('or')}
                submitLabel={t('Log in')}
                switchLabel={t('create an account')}
                onSubmit={handleLoginSubmit}
                onSwitch={() => {
                  dispatch(closeLoginDrawer())
                  resetLoginForm()
                  setTimeout(() => setSignupOpen(true), 300)
                }}
                trigger={
                  <Button
                    onClick={() => dispatch(openLoginDrawer())}
                    className="font-semibold px-3 py-1 rounded-full hover:opacity-90 transition whitespace-nowrap min-w-25 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-btn-bg)',
                      color: 'var(--color-btn-text)',
                      fontSize: i18n.language === 'ml' ? '10px' : '15px',
                      lineHeight: '1.5rem',
                      fontWeight: i18n.language === 'ml' ? 600 : 700,
                    }}
                  >
                    {t('Sign in')}
                  </Button>
                }
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                }
              >
                <FieldSet className="w-full">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="username">{t('Username')}</FieldLabel>
                      <Input id="username" value={loginForm.username} type="text" placeholder={t('Enter your username')} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="password">{t('Password')}</FieldLabel>
                      <PasswordInput id="password" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()} />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </AuthDrawer>


              <AuthDrawer
                open={signupOpen}
                onOpenChange={(open) => {
                  setSignupOpen(open)
                  if (!open) resetSignupForm()
                }}
                title={t('Sign Up')}
                switchText={t('or')}
                submitLabel={t('Sign Up')}
                switchLabel={t('login to your account')}
                onSubmit={handleSignupSubmit}
                onSwitch={() => {
                  setSignupOpen(false)
                  resetSignupForm()
                  setTimeout(() => dispatch(openLoginDrawer()), 300)
                }}
                color="teal"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="8" r="4" />
                    <path d="M4 20c0-4 3.2-7 7-7" />
                    <line x1="19" y1="12" x2="19" y2="18" />
                    <line x1="16" y1="15" x2="22" y2="15" />
                  </svg>
                }
              >
                <FieldSet className="w-full">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="username">{t('Username')}</FieldLabel>
                      <Input id="username" type="username" placeholder={t('Enter your username')} value={signupForm.username} onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor="first-name">{t('First name')}</FieldLabel>
                        <Input id="first-name" type="text" placeholder={t('Enter First Name')} value={signupForm.first_name} onChange={(e) => setSignupForm({ ...signupForm, first_name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="last-name">{t('Last name')}</FieldLabel>
                        <Input id="last-name" type="text" placeholder={t('Enter Last Name')} value={signupForm.last_name} onChange={(e) => setSignupForm({ ...signupForm, last_name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="email">{t('Email')}</FieldLabel>
                      <Input id="email" type="email" placeholder={t('Enter Email')} value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="signup-password">{t('Password')}</FieldLabel>
                      <PasswordInput id="signup-password" placeholder="••••••••" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()} />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </AuthDrawer>
            </div>
          )}
        </li>





        <li className="flex justify-center items-center min-w-[40px]">
          <Themetoggle />
        </li>

      </ul>


      <div className="hidden lg:block absolute right-0 z-10">
        <button
          onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ml" : "en")}
          className="
            group bg-orange-500 rounded-l-full
            h-10 w-10 hover:w-32
            overflow-hidden whitespace-nowrap
            flex items-center justify-center
            cursor-pointer shadow-md relative
          "
          style={{
            backgroundColor: '#f97316',
            color: 'var(--color-nav-text)',
            fontWeight: i18n.language === 'ml' ? 600 : 700,
            transition: 'width 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
            willChange: 'width'
          }}
        >
          <span className="font-bold transition-opacity duration-700 group-hover:opacity-0 pointer-events-none">
            {i18n.language === "en" ? "മ" : "En"}
          </span>
          <span className="font-bold opacity-0 transition-opacity duration-700 group-hover:opacity-100 absolute inset-0 flex items-center justify-center pointer-events-none">
            {i18n.language === "en" ? "മലയാളം" : "English"}
          </span>
        </button>
      </div>

    </div>
  )
}