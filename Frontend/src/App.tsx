
import './App.css'
import Restaurants from './Components/Restaurants'
import Body from './Components/Body'
import Cart from './Components/Cart'
import Menu from './Components/Menu'
import Layout from './Layout'
import FoodDashAdmin from './Components/Dashboard'
import { Toaster } from 'react-hot-toast'
import { Route, Routes } from 'react-router-dom'



function App() {


  return (


    <div className='hero'>
      <Toaster position="bottom-right" />

      <Routes>
        <Route element={<Layout />}>
          <Route path='/' element={<Body />} />
          <Route path='/restaurant' element={<Restaurants />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/menu' element={<Menu />} />
        </Route>
        <Route path='/dashboard' element={<FoodDashAdmin />} />

      </Routes>

    </div>


  )

}

export default App
