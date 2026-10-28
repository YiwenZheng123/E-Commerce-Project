import React, {useState} from 'react'
import './App.css'
import Products from './components/products/Products'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './components/home/Home'
import Navbar from './components/shared/Navbar'
import About from './components/About'
import Contact from './components/Contact'
import Cart from './components/cart/Cart'
import { Toaster } from 'react-hot-toast'
import LogIn from './components/auth/LogIn'
import PrivateRoute from './components/PrivateRoute'
import Register from './components/auth/Register'
import CheckOut from './components/checkout/CheckOut'
import PaymentConfirmation from './components/checkout/PaymentConfirmation'
import AdminLayout from './components/admin/AdminLayout'
import Dashboard from './components/admin/dashboard/Dashboard'
import Category from './components/admin/categories/Category'
import Sellers from './components/admin/sellers/Sellers'
import AdminProducts from './components/admin/products/AdminProducts'
import Orders from './components/admin/orders/Orders'
import Profile from './components/profile/Profile'


function App() {
  const[count, setCount] = useState(0)
  

  return (
    <React.Fragment>
    <Router>
      <Navbar />
      <Routes>
        <Route path='/' element={ <Home /> }/>
        <Route path='/about' element={ <About /> }/>
        <Route path='/products' element={ <Products /> }/>
        <Route path='/contact' element={ <Contact /> }/>
        <Route path='/cart' element={ <Cart /> }/>
        
        <Route element={ <PrivateRoute />}>
          <Route path='/profile' element={ <Profile /> }/>
          <Route path='/checkout' element={ <CheckOut /> }/>
          <Route path='/order-confirm' element={ <PaymentConfirmation /> }/>
        </Route>

        <Route element={ <PrivateRoute publicPage/>}>
          <Route path='/login' element={ <LogIn /> }/>
          <Route path='/register' element={ <Register /> }/>
        </Route>

        <Route element={ <PrivateRoute adminOnly/>}>
          <Route path='/admin' element={ <AdminLayout /> }>
            <Route path='' element={ <Dashboard /> }/>
            <Route path='products' element={ <AdminProducts /> }/>
            <Route path='orders' element={ <Orders /> }/>
            <Route path='categories' element={ <Category /> }/>
            <Route path='sellers' element={ <Sellers /> }/>
          </Route>
        </Route>
      </Routes>
    </Router>
    <Toaster position='bottom-center'/>
    </React.Fragment>
      

    
  )
}

export default App
