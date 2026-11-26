const initialState = {
    selectedIds: [],
    cart: [],
    totalPrice:0,
    cartId: null,
    isSaving: false,
}

export const cartReducer = (state = initialState, action) => {
    switch (action.type) {
        case "SELECT_CART_ITEMS":
            return { ...state, selectedIds: action.payload };
        case "LOG_OUT":
            return initialState;
        case "CART_SAVING":
            return { ...state, isSaving: action.payload };
        case "ADD_CART":
            { const productToAdd = action.payload;
            const existingProduct = state.cart.find(
                (item) => item.productId === productToAdd.productId
            );
            if(existingProduct){
                const updatedCart = state.cart.map(
                    (item) => {
                        if(item.productId === productToAdd.productId){
                            return {
                                ...item,
                                ...productToAdd,
                            };
                        }else{
                            return item;
                        }

                });
                return {
                    ...state,
                    cart: updatedCart,
                }
            } else {
                const newCart = [...state.cart,  productToAdd];
                return {
                    ...state,
                    cart: newCart,
                }
            } }
        
        case "REMOVE_CART":
             return {
                ...state,
                cart: state.cart.filter(
                    (item) => item.productId !== action.payload.productId
                ),
            };
            
        case "GET_USER_CART_PRODUCTS":
            return {
                ...state,
                cart: action.payload,
                totalPrice:action.totalPrice,
                cartId:action.cartId,
            }
        case "CLEAR_CART":
            return {
                ...state,
                selectedIds: [],
    cart: [],
                totalPrice:0,
                cartId:null,
            }
        default:
            return state;
    }
    

};
