import api from "../../api/api";


export const fetchProducts = (queryString) => async (dispatch) => {
    try {
        dispatch({ type: "IS_FETCHING" });
        const { data } = await api.get(`/public/products?${queryString}`);
        dispatch({
            type: 'FETCH_PRODUCTS',
            payload: data.content,
            pageNumber: data.pageNumber,
            pageSize: data.pageSize,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            lastPage: data.lastPage,

        });
        dispatch({ type: "IS_SUCCESS" });
    } catch (error) {
        console.log(error);
        dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch products" });
    }
}

export const fetchCategories = () => async (dispatch) => {
    try {
        dispatch({ type: "CATEGORY_LOADER" });
        const { data } = await api.get(`/public/categories`);
        dispatch({
            type: 'FETCH_CATEGORIES',
            payload: data.content,
            pageNumber: data.pageNumber,
            pageSize: data.pageSize,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            lastPage: data.lastPage,

        });
        dispatch({ type: "CATEGORY_SUCCESS" });
    } catch (error) {
        console.log(error);
        dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch categories" });
    }
}

export const addToCart = (data, qty = 1, toast) =>
    (dispatch, getState) => {
        console.log(getState());
        //find the product
        const { products } = getState().products;
        const getProduct = products.find((item) => item.productId === data.productId);

        //Check for stocks
        const isQuantityExist = getProduct.stock >= qty;
        // If in stock, add to cart
        if (isQuantityExist) {
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

        } else {
            toast.error("Out Of Stock ");
        }
        // If not in stock, show error


    };

export const increaseCartQuantity =
    (data, toast, currentQuantity, setCurrentQuantity) =>
        (dispatch, getState) => {
            const { cart } = getState().carts;
            const cartProduct = cart.find(
                (item) => item.productId === data.productId
            );

            if (!cartProduct) {
                toast.error("We Can Not Find The Product In Cart");
                return;
            }

            if (cartProduct.stock == null) {
                toast.error("Lack of Stock Infomation. Please Go Back To Product Page and Add this Products");
                return;
            }

            const newQuantity = Number(currentQuantity) + 1;

            if (newQuantity > Number(cartProduct.stock)) {
                toast.error("Quantity Reached to Limit of Stock");
                return;
            }

            dispatch({
                type: "ADD_CART",
                payload: {
                    ...data,
                    quantity: newQuantity,
                },
            });

            setCurrentQuantity(newQuantity);

            localStorage.setItem(
                "cartItems",
                JSON.stringify(getState().carts.cart)
            );

            // const { products } = getState().products;   
            // const getProduct = products.find(
            //     (item) => item.productId === data.productId
            // );

            // const isQuantityExist = getProduct.quantity >= currentQuantity + 1;

            // if (isQuantityExist) {
            //     const newQuantity = currentQuantity + 1;
            //     setCurrentQuantity(newQuantity);

            //     dispatch({
            //         type: "ADD_CART",
            //         payload: {...data, quantity: newQuantity + 1 },
            //     });
            //     localStorage.setItem("cartItems", JSON.stringify(getState().carts.cart));
            // } else {
            //     toast.error("Quantity Reached to Limit");
            // }
        };

export const decreaseCartQuantity =
    (data, newQuantity) => (dispatch, getState) => {
        dispatch({
            type: "ADD_CART",
            payload: { ...data, quantity: newQuantity },
        });
        localStorage.setItem("cartItems", JSON.stringify(getState().carts.cart));
    }

export const removeFromCart = (data, toast) => (dispatch, getState) => {
    dispatch({ type: "REMOVE_CART", payload: data });
    toast.success(`${data.productName} removed from cart`);
    localStorage.setItem("cartItems", JSON.stringify(getState().carts.cart));
}

export const authenticateSignInUser
    = (sendData, toast, reset, navigate, setLoader) => async (dispatch) => {
        try {
            setLoader(true);
            const { data } = await api.post(`/auth/signin`, sendData);

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
            const { data } = await api.post(`/auth/signup`, sendData);
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
    dispatch({ type: "LOG_OUT" });
    localStorage.removeItem("auth");
    navigate("/login");

}

export const getUserProfile = (navigate, setLoader, setErrorMessage) => async (dispatch) => {
    try {
        setLoader(true);
        setErrorMessage("");
        const { data } = await api.get("/auth/user");
        dispatch({ type: "LOGIN_USER", payload: data });
        localStorage.setItem("auth", JSON.stringify(data));
    } catch (error) {
        if (error?.response?.status === 401) {
            dispatch(logOutUser(navigate));
        } else {
            setErrorMessage("Failed to load your profile. Please reload the page.");
        }
    } finally {
        setLoader(false);
    }
}

export const updateUserProfile = (sendData, toast, setLoader) => async (dispatch) => {
    try {
        setLoader(true);
        const { data } = await api.put("/auth/profile", sendData);
        dispatch({ type: "LOGIN_USER", payload: data });
        localStorage.setItem("auth", JSON.stringify(data));
        toast.success("Profile updated successfully");
    } catch (error) {
        toast.error(error?.response?.data?.message || error?.response?.data?.username || "Failed to update profile");
    } finally {
        setLoader(false);
    }
}

export const updateUserAvatar = (image, toast, setLoader) => async (dispatch) => {
    try {
        setLoader(true);
        const formData = new FormData();
        formData.append("image", image);
        const { data } = await api.put("/auth/profile/avatar", formData);
        dispatch({ type: "LOGIN_USER", payload: data });
        localStorage.setItem("auth", JSON.stringify(data));
        toast.success("Profile photo updated successfully");
    } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to update profile photo");
    } finally {
        setLoader(false);
    }
}

export const updateUserPassword = (sendData, toast, reset, navigate, setLoader) => async (dispatch) => {
    try {
        setLoader(true);
        const { data } = await api.put("/auth/password", sendData);
        reset();
        toast.success(data.message);
        dispatch(logOutUser(navigate));
    } catch (error) {
        toast.error(error?.response?.data?.message || error?.response?.data?.newPassword
            || error?.response?.data?.currentPassword || error?.response?.data?.confirmPassword || "Failed to update password");
    } finally {
        setLoader(false);
    }
}

export const addUpdateUserAddress =
    (sendData, toast, addressId, setOpenAddressModal) => async (dispatch, getState) => {
        // const {user} = getState().auth;
        dispatch({ type: "BUTTON_LOADER" })
        try {
            if (!addressId) {
                await api.post("/addresses", sendData);
            } else {
                const { data } = await api.put(`/addresses/${addressId}`, sendData);
                if (getState().auth.selectedUserCheckoutAddress?.addressId === addressId) {
                    dispatch(selectUserCheckoutAddress(data));
                }
            }
            toast.success("Address saved successfully");
            dispatch({ type: "IS_SUCCESS" });
            setOpenAddressModal(false);
            await dispatch(getUserAddresses());

        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.message || Object.values(error?.response?.data || {})[0] || "Failed to save address");
            dispatch({ type: "IS_ERROR", payload: null })
        }


    }


export const getUserAddresses = () => async (dispatch, getState) => {
    try {
        dispatch({ type: "IS_FETCHING" });
        const { data } = await api.get(`/users/addresses`);
        dispatch({
            type: 'USER_ADDRESS',
            payload: data,
        });
        dispatch({ type: "IS_SUCCESS" });
    } catch (error) {
        console.log(error);
        dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch user address" });
    }
}

export const selectUserCheckoutAddress = (address) => {
    localStorage.setItem("CHECKOUT_ADDRESS", JSON.stringify(address));
    return {
        type: "SELECT_CHECKOUT_ADDRESS",
        payload: address,
    }
}

export const deleteUserAddress =
    (toast, addressId, setOpenDeleteModal) => async (dispatch, getState) => {
        try {
            dispatch({ type: "BUTTON_LOADER" })
            await api.delete(`/addresses/${addressId}`);
            dispatch({ type: "IS_SUCCESS" });
            dispatch(getUserAddresses());
            dispatch(clearCheckOutAddress());
            toast.success("Address deleted successfully");
        } catch (error) {
            console.log(error);
            dispatch({
                type: "IS_ERROR",
                payload: error?.response?.data?.message || "Some Error Occured",
            });
        } finally {
            setOpenDeleteModal(false);
        }

    }

export const clearCheckOutAddress = () => {
    return {
        type: "REMOVE_CHECKOUT_ADDRESS",
    }
}

export const addPaymentMethod = (method) => {
    return {
        type: "ADD_PAYMENT_METHOD",
        payload: method,
    }
}

export const createUserCart = (sendCartItems) => async (dispatch, getState) => {
    try {
        dispatch({ type: "IS_FETCHING" });
        await api.post(`/carts/create`, sendCartItems);
        await dispatch(getUserCart());
    } catch (error) {
        console.log(error);
        dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to create cart items" });
    }
}

export const getUserCart = () => async (dispatch, getState) => {
    try {
        dispatch({ type: "IS_FETCHING" });
        const { data } = await api.get(`/carts/users/cart`);
        dispatch({
            type: 'GET_USER_CART_PRODUCTS',
            payload: data.products,
            totalPrice: data.totalPrice,
            cartId: data.cartId,
        })
        localStorage.setItem("cartItems", JSON.stringify(getState().carts.cart));
        dispatch({ type: "IS_SUCCESS" });
    } catch (error) {
        console.log(error);
        dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch cart items" });
    }
}

export const createStripePaymentSecret
    = (sendData, toast) => async (dispatch) => {
        try {
            dispatch({ type: "IS_FETCHING" });
            const { data } = await api.post(`/order/stripe-client-secret`, sendData);
            dispatch({ type: "CLIENT_SECRET", payload: data });
            localStorage.setItem("client-secret", JSON.stringify(data));
            dispatch({ type: "IS_SUCCESS" });

        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.message || error?.response?.data?.password || "Internal Server Error");

        }

    }

export const stripePaymentConfirmation
    = (sendData, setErrorMessage, setLoading, toast) => async (dispatch) => {
        try {
            const response = await api.post(`/order/users/payments/online`, sendData);
            console.log(response)
            if (response.data) {
                localStorage.removeItem("CHECKOUT_ADDRESS");
                localStorage.removeItem("cartItems");
                localStorage.removeItem("client-secret");
                dispatch({ type: "REMOVE_CLIENT_SECRET_ADDRESS" });
                dispatch({ type: "CLEAR_CART" });
                toast.success("Order Accepted");

            } else {
                setErrorMessage("Payment Failed. Please try agian.");
            }
        } catch (error) {
            setErrorMessage("Payment Failed. Please try agian.");

        }

    }

export const analyticsAction
    = () => async (dispatch) => {
        try {
            dispatch({ type: "IS_FETCHING" });
            const { data } = await api.get(`/admin/app/analytics`);
            dispatch({
                type: "FETCH_ANALYTICS",
                payload: data,
            })
            dispatch({ type: "IS_SUCCESS" });
        } catch (error) {
            dispatch({
                type: "IS_ERROR",
                payload: error?.response?.data?.message || "Failed to fetch analytics data"
            });


        }

    }


export const getDashboardOrders = (queryString, isAdmin) => async (dispatch) => {
    try {
        dispatch({ type: "IS_FETCHING" });
        const endpoint = isAdmin ? "/admin/orders" : "/seller/orders";
        const { data } = await api.get(`${endpoint}?${queryString}`) ;
        dispatch({
            type: 'GET_ADMIN_ORDERS',
            payload: data.content,
            pageNumber: data.pageNumber,
            pageSize: data.pageSize,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            lastPage: data.lastPage,

        });
        dispatch({ type: "IS_SUCCESS" });
    } catch (error) {
        console.log(error);
        dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch products" });
    }
}

export const updateOrderStatusFromDashboard =
    (orderId, orderStatus, toast, setLoader, isAdmin) => async (dispatch, getState) => {
        // const {user} = getState().auth;
        dispatch({ type: "BUTTON_LOADER" })
        try {
            setLoader(true);
            const endpoint = isAdmin ? "/admin/orders" : "/seller/orders";
            const { data } = await api.put(`${endpoint}/${orderId}/status`, { status: orderStatus });
            toast.success(data.message || "Order updated successfully");
            const { pageNumber, pageSize } = getState().order.pagination;
            await dispatch(getDashboardOrders(`pageNumber=${pageNumber}&pageSize=${pageSize}`));
            dispatch({ type: "IS_SUCCESS" });

        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.message || "Internal Server Error");

        } finally {
            setLoader(false);
        }


    }


export const dashboardProductsAction = (queryString, isAdmin) => async (dispatch, getState) => {
    try {
        if (queryString === undefined) {
            const { pageNumber, pageSize } = getState().products.pagination;
            const params = new URLSearchParams();
            if (pageNumber != null) params.set("pageNumber", String(pageNumber));
            if (pageSize != null) params.set("pageSize", String(pageSize));
            queryString = params.toString();
        }
        const endpoint = isAdmin ? "/admin/products" : "/seller/products";
        dispatch({ type: "IS_FETCHING" });
        const { data } = await api.get(`${endpoint}?${queryString}`);
        dispatch({
            type: 'FETCH_PRODUCTS',
            payload: data.content,
            pageNumber: data.pageNumber,
            pageSize: data.pageSize,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            lastPage: data.lastPage,

        });
        dispatch({ type: "IS_SUCCESS" });
    } catch (error) {
        console.log(error);
        dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch dashboard products" });
    }
}

export const updateAdminProductsFromDashboard = (sendData, toast, reset, setLoader, setOpen, isAdmin) =>
    async (dispatch) => {
        try {
            setLoader(true);
            const endpoint = isAdmin ? "/admin/products" : "/seller/products";
            await api.put(`${endpoint}/${sendData.id}`, sendData);
            toast.success("Product updated successfully");
            reset();
            setLoader(false);
            setOpen(false);
            await dispatch(dashboardProductsAction());
        } catch (error) {
            console.log(error);
            dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Products update failed" });
        }
    }
export const addNewProductFromDashboard = (sendData, toast, reset, setLoader, setOpen, isAdmin) =>
    async (dispatch, getState) => {
        try {
            setLoader(true);
            const endpoint = isAdmin ? "/admin/categories" : "/seller/categories";
            await api.post(`${endpoint}/${sendData.categoryId}/product`, sendData);
            toast.success("Product created successfully");
            reset();
            setLoader(false);
            setOpen(false);
            await dispatch(dashboardProductsAction(undefined, isAdmin));
        } catch (error) {
            console.log(error);
            dispatch({ type: "IS_ERROR", payload: error?.response?.data?.description || "Products creation failed" });
        } finally {
            setLoader(false);
        }
    }


export const deleteProduct =
    (setLoader, productId, toast, setOpenDeleteModal, isAdmin) => async (dispatch) => {
        try {
            setLoader(true);
            const endpoint = isAdmin ? "/admin/products" : "/seller/products";
            await api.delete(`${endpoint}/${productId}`);
            toast.success("Product deleted successfully");
            setLoader(false);
            setOpenDeleteModal(false);
            await dispatch(dashboardProductsAction());


        } catch (error) {
            console.log(error);
            toast.error(error?.response?.data?.message || "Failed to delete product");
        }

    }

export const updateProductImageFromDashboard = (formData, productId, toast, setLoader, setOpen, isAdmin) =>
    async (dispatch) => {
        try {
            setLoader(true);
            const endpoint = isAdmin ? "/admin/products" : "/seller/products";
            await api.put(`${endpoint}/${productId}/image`, formData);
            toast.success("Image updated successfully");
            setLoader(false);
            setOpen(false);
            await dispatch(dashboardProductsAction());
        } catch (error) {
            dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Image update failed" });
        }
    }


export const dashboardCategoriesAction = (queryString) => async (dispatch, getState) => {
    try {
        if (queryString === undefined) {
            const { pageNumber, pageSize } = getState().products.categoryPagination;
            const params = new URLSearchParams();
            if (pageNumber != null) params.set("pageNumber", String(pageNumber));
            if (pageSize != null) params.set("pageSize", String(pageSize));
            queryString = params.toString();
        }
        dispatch({ type: "CATEGORY_LOADER" });
        const { data } = await api.get(`/public/categories?${queryString}`);
        dispatch({
            type: 'FETCH_CATEGORIES',
            payload: data.content,
            pageNumber: data.pageNumber,
            pageSize: data.pageSize,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            lastPage: data.lastPage,

        });
        dispatch({ type: "CATEGORY_SUCCESS" });
    } catch (error) {
        console.log(error);
        dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch categories", });
    }
}
export const updateAdminCategoriesFromDashboard = (sendData, toast, reset, setOpen, setSubmitError) =>
    async (dispatch) => {
        try {
            dispatch({ type: "CATEGORY_LOADER" });
            await api.put(`/admin/categories/${sendData.categoryId}`, sendData);
            dispatch({ type: "CATEGORY_SUCCESS" });
            reset();
            toast.success("Category updated successfully");
            setOpen(false);
            await dispatch(dashboardCategoriesAction());
        } catch (error) {
            console.log(error);
            const message = error?.response?.data?.categoryName || error?.response?.data?.message || "Failed to update category";
            toast.error(message);
            setSubmitError(message);
            dispatch({ type: "CATEGORY_SUCCESS" });
        }
    }

export const deleteCategory =
    (setLoader, categoryId, toast, setOpenDeleteModal, onPageChange) => async (dispatch, getState) => {
        try {
            setLoader(true);
            const { pageNumber, pageSize, totalElements } = getState().products.categoryPagination;
            await api.delete(`/admin/categories/${categoryId}`);
            toast.success("Category deleted successfully");
            setOpenDeleteModal(false);
            // shortcut: uses the loaded total, refetch authoritative totals when supporting concurrent edits.
            if (totalElements === 1) {
                dispatch({
                    type: "FETCH_CATEGORIES", payload: [], pageNumber: 0, pageSize,
                    totalElements: 0, totalPages: 0, lastPage: true
                });
            } else {
                const lastPage = Math.max(0, Math.ceil((totalElements - 1) / pageSize) - 1);
                if (pageNumber > lastPage) {
                    onPageChange({ page: lastPage });
                } else {
                    await dispatch(dashboardCategoriesAction());
                }
            }


        } catch (error) {
            console.log(error);
            toast.error(error?.response?.data?.message || "Failed to delete category");
        } finally {
            setLoader(false);
        }

    }

export const createCategoriesFromDashboard = (sendData, toast, reset, setOpen, setSubmitError) =>
    async (dispatch) => {
        try {
            dispatch({ type: "CATEGORY_LOADER" });
            await api.post("/admin/categories", sendData);
            dispatch({ type: "CATEGORY_SUCCESS" });
            reset();
            toast.success("Category created successfully");
            setOpen(false);
            await dispatch(dashboardCategoriesAction());
        } catch (error) {
            console.log(error);
            const message = error?.response?.data?.categoryName || error?.response?.data?.message || "Failed to create new category";
            toast.error(message);
            setSubmitError(message);
            dispatch({ type: "CATEGORY_SUCCESS" });
        }
    }

export const getAllSellersDashboard =
    (queryString) => async (dispatch, getState) => {
        try {
            if(queryString === undefined) {
                const params = new URLSearchParams();
                const { pageNumber, pageSize } = getState().seller.sellersPagination;
                if (pageNumber != null) params.set("pageNumber", String(pageNumber));
                if (pageSize != null) params.set("pageSize", String(pageSize));
                queryString = params.toString();
            }
            dispatch({ type: "IS_FETCHING" });
            const { data } = await api.get(`/auth/sellers?${queryString}`);
            dispatch({
                type: "GET_SELLERS",
                payload: data["content"],
                pageNumber: data["pageNumber"],
                pageSize: data["pageSize"],
                totalElements: data["totalElements"],
                totalPages: data["totalPages"],
                lastPage: data["lastPage"],
            });

            dispatch({ type: "IS_SUCCESS" });
        } catch (err) {
            console.log(err);
            dispatch({
                type: "IS_ERROR",
                payload: err?.response?.data?.message || "Failed to fetch sellers data",
            });
        }
    };

export const addNewDashboardSeller =
    (sendData, toast, reset, setOpen, setLoader) => async (dispatch) => {
        try {
            setLoader(true);
            await api.post("/auth/signup", sendData);
            reset();
            toast.success("Seller registered successfully!");
            setOpen(false);
            await dispatch(getAllSellersDashboard());
        } catch (err) {
            console.log(err);
            toast.error(
                err?.response?.data?.message ||
                err?.response?.data?.password ||
                "Internal Server Error"
            );
        } finally {
            setLoader(false);
            
        }
    };
