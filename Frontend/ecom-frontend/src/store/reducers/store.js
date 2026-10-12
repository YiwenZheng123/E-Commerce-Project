import {configureStore} from '@reduxjs/toolkit';
import {productReducer} from './ProductReducer';
import {errorReducer} from './errorReducer';
import {cartReducer} from './cartReducer';
import {authReducer} from './AuthReducer';


const cartItems = localStorage.getItem('cartItems')
    ? JSON.parse(localStorage.getItem('cartItems'))
    : [];

const user = localStorage.getItem('auth')
    ? JSON.parse(localStorage.getItem('auth'))
    : null;
const initialState = {
    auth:{
        user:user,
    },
    carts: {
        cart: cartItems,
    }
};

export const store = configureStore({
    reducer: {
        products: productReducer,
        errors: errorReducer,
        carts: cartReducer,
        auth: authReducer,
    },
    preloadedState: initialState,
    
})

export default store;