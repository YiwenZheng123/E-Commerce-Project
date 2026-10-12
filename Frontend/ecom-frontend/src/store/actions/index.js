import api from "../../api/api";


export const fetchProducts = (queryString) => async (dispatch) => {
    try{
        dispatch({type: "IS_FETCHING"});
        const{ data } = await api.get(`/public/products?${queryString}`);
        dispatch({
            type: 'FETCH_PRODUCTS',
            payload: data.content,
            pageNumber: data.pageNumber,
            pageSize: data.pageSize,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            lastPage: data.lastPage,

        });
        dispatch({type: "IS_SUCCESS"});
    } catch (error) {
        console.log(error);
        dispatch({type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch products"});
    }
}

export const fetchCategories = () => async (dispatch) => {
    try{
        dispatch({type: "CATEGORY_LOADER"});
        const{ data } = await api.get(`/public/categories`);
        dispatch({
            type: 'FETCH_CATEGORIES',
            payload: data.content,
            pageNumber: data.pageNumber,
            pageSize: data.pageSize,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            lastPage: data.lastPage,

        });
        dispatch({type: "CATEGORY_SUCCESS"});
    } catch (error) {
        console.log(error);
        dispatch({type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch categories"});
    }
}

export const addToCart = (data, qty = 1, toast) =>
     (dispatch, getState) => {
        console.log(getState());
        //find the product
        const {products} = getState().products;
        const getProduct = products.find((item) => item.productId === data.productId);

        //Check for stocks
        const isQuantityExist = getProduct.stock >= qty;
        // If in stock, add to cart
        if(isQuantityExist){
            dispatch(
                {
                    type: "ADD_CART",
                    payload: {
                        ...data,
                        quantity: qty,
                        
                    }
                }
            )
            toast.success(`${data.productName} added to cart`);
            localStorage.setItem("cartItems", JSON.stringify(getState().carts.cart));
            
        }else {
            toast.error("Out Of Stock ");
        }
        // If not in stock, show error


};

export const increaseCartQuantity =
    (data, toast, currentQuantity, setCurrentQuantity) =>
    (dispatch, getState) => {
        // const { cart } = getState().carts;
        // const cartProduct = cart.find(
        //     (item) => item.productId === data.productId
        // );

        // if (!cartProduct) {
        //     toast.error("We Can Not Find The Product In Cart");
        //     return;
        // }

        // if (cartProduct.stock == null) {
        //     toast.error("Lack of Stock Infomation. Please Go Back To Product Page and Add this Products");
        //     return;
        // }

        // const newQuantity = Number(currentQuantity) + 1;

        // if (newQuantity > Number(cartProduct.stock)) {
        //     toast.error("Quantity Reached to Limit of Stock");
        //     return;
        // }

        // dispatch({
        //     type: "ADD_CART",
        //     payload: {
        //         ...data,
        //         quantity: newQuantity,
        //     },
        // });

        // setCurrentQuantity(newQuantity);

        // localStorage.setItem(
        //     "cartItems",
        //     JSON.stringify(getState().carts.cart)
        // );

        const { products } = getState().products;   
        const getProduct = products.find(
            (item) => item.productId === data.productId
        );

        const isQuantityExist = getProduct.quantity >= currentQuantity + 1;

        if (isQuantityExist) {
            const newQuantity = currentQuantity + 1;
            setCurrentQuantity(newQuantity);

            dispatch({
                type: "ADD_CART",
                payload: {...data, quantity: newQuantity + 1 },
            });
            localStorage.setItem("cartItems", JSON.stringify(getState().carts.cart));
        } else {
            toast.error("Quantity Reached to Limit");
        }
    };

export const decreaseCartQuantity = 
(data, newQuantity) => (dispatch, getState) => {
    dispatch({
        type: "ADD_CART",
        payload: {...data, quantity: newQuantity},
    });
    localStorage.setItem("cartItems", JSON.stringify(getState().carts.cart));
}

export const removeFromCart =  (data, toast) => (dispatch, getState) => {
    dispatch({type: "REMOVE_CART", payload: data });
    toast.success(`${data.productName} removed from cart`);
    localStorage.setItem("cartItems", JSON.stringify(getState().carts.cart));
}

export const authenticateSignInUser 
    = (sendData, toast, reset, navigate, setLoader) => async (dispatch) => {
        try {
            setLoader(true);
            const{ data } = await api.post(`/auth/signin`, sendData);
        
            dispatch({
                type: "LOGIN_USER",
                payload: data,
            });
            localStorage.setItem("auth", JSON.stringify(data));
            reset();
            toast.success("Login Successful");
            navigate("/");
        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.message || "Internal Server Error");
            
        } finally {
            setLoader(false);
        }
    
}

export const registerNewUser 
    = (sendData, toast, reset, navigate, setLoader) => async (dispatch) => {
        try {
            setLoader(true);
            const{ data } = await api.post(`/auth/signup`, sendData);
            reset();
            toast.success(data?.message || "User Registered Successful");
            navigate("/login");
        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.message || error?.response?.data?.password || "Internal Server Error");
            
        } finally {
            setLoader(false);
        }
    
}

export const logOutUser = (navigate) => (dispatch) => {
    dispatch({type: "LOG_OUT"});
    localStorage.removeItem("auth");
    navigate("/login");

}
