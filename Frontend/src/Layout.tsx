
import { Outlet } from 'react-router-dom'
import Header from './Components/Header'
import ScrollToTopButton from './Components/ScrollToTopButton'

export default function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <ScrollToTopButton />
    </>
  )
}