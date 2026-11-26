import api from "../../api/api";
import notifications from "react-hot-toast";


export const fetchProducts = (queryString = "") => async (dispatch) => {
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

export const selectCartItems = (ids) => (dispatch) => {
    dispatch({ type: "SELECT_CART_ITEMS", payload: ids });
    localStorage.setItem("cartSelectedIds", JSON.stringify(ids));
    dispatch({ type: "CLIENT_SECRET", payload: null });
    localStorage.removeItem("client-secret");
};

const saveCart = (cart) => async (dispatch, getState) => {
    if (getState().carts.isSaving) {
        notifications.error("Please wait for your cart update to finish");
        return false;
    }
    dispatch({ type: "CART_SAVING", payload: true });
    try {
        if (getState().auth.user) {
            await api.post("/carts/create", cart.map(({ productId, quantity }) => ({ productId, quantity })));
        }
        dispatch({ type: "GET_USER_CART_PRODUCTS", payload: cart,
            totalPrice: cart.reduce((total, item) => total + item.specialPrice * item.quantity, 0),
            cartId: getState().carts.cartId });
        localStorage.setItem("cartItems", JSON.stringify(cart));
        dispatch(selectCartItems((getState().carts.selectedIds || []).filter(id => cart.some(item => item.productId === id))));
        return true;
    } catch (error) {
        notifications.error(error?.response?.data?.message || "Could not save cart. Please try again.");
        return false;
    } finally {
        dispatch({ type: "CART_SAVING", payload: false });
    }
};

export const addToCart = (data, qty = 1, toast) => async (dispatch, getState) => {
    const { cart } = getState().carts;
    const existing = cart.find(item => item.productId === data.productId);
    const quantity = (existing?.quantity || 0) + qty;
    if (quantity > data.stock) {
        toast.error("Quantity reached the stock limit");
        return;
    }
    const nextCart = existing
        ? cart.map(item => item.productId === data.productId ? { ...item, quantity } : item)
        : [...cart, { ...data, quantity }];
    if (await dispatch(saveCart(nextCart))) {
        dispatch(selectCartItems([...new Set([...(getState().carts.selectedIds || []), data.productId])]));
        toast.success(`${data.productName} added to cart`);
    }
};

export const increaseCartQuantity = (data, toast, currentQuantity, setCurrentQuantity) =>
    async (dispatch, getState) => {
        const { cart } = getState().carts;
        const product = cart.find(item => item.productId === data.productId);
        if (!product || product.stock == null || currentQuantity >= product.stock) {
            toast.error("Cannot increase quantity. Please check product stock.");
            return;
        }
        const quantity = Number(currentQuantity) + 1;
        if (await dispatch(saveCart(cart.map(item => item.productId === data.productId ? { ...item, quantity } : item)))) {
            setCurrentQuantity(quantity);
        }
    };

export const decreaseCartQuantity = (data, quantity) => (dispatch, getState) =>
    dispatch(saveCart(getState().carts.cart.map(item => item.productId === data.productId ? { ...item, quantity } : item)));

export const removeFromCart = (data, toast) => async (dispatch, getState) => {
    if (await dispatch(saveCart(getState().carts.cart.filter(item => item.productId !== data.productId)))) {
        toast.success(`${data.productName} removed from cart`);
    }
};

const clearSession = (dispatch) => {
    dispatch({ type: "LOG_OUT" });
    for (const key of ["auth", "cartItems", "cartSelectedIds", "CHECKOUT_ADDRESS", "client-secret"]) localStorage.removeItem(key);
};

export const authenticateSignInUser
    = (sendData, toast, reset, navigate, setLoader, returnToCart = false) => async (dispatch, getState) => {
        const guestCart = getState().auth.user ? [] : getState().carts.cart;
        const guestSelection = getState().carts.selectedIds || [];
        let signedIn = false;
        try {
            setLoader(true);
            const { data: user } = await api.post("/auth/signin", sendData);
            signedIn = true;
            const { data: accountCart } = await api.get("/carts/users/cart");
            let products = accountCart.products;
            if (guestCart.length) {
                const merged = new Map(products.map(item => [item.productId, { ...item }]));
                for (const item of guestCart) {
                    const existing = merged.get(item.productId);
                    merged.set(item.productId, existing ? { ...existing, quantity: existing.quantity + item.quantity } : item);
                }
                await api.post("/carts/create", [...merged.values()].map(({ productId, quantity }) => ({ productId, quantity })));
                products = [...merged.values()];
            }
            clearSession(dispatch);
            navigate(returnToCart || guestCart.length ? "/cart" : "/");
            dispatch({ type: "LOGIN_USER", payload: user });
            localStorage.setItem("auth", JSON.stringify(user));
            dispatch({ type: "GET_USER_CART_PRODUCTS", payload: products, cartId: accountCart.cartId,
                totalPrice: products.reduce((total, item) => total + item.specialPrice * item.quantity, 0) });
            localStorage.setItem("cartItems", JSON.stringify(products));
            dispatch(selectCartItems(guestSelection));
            reset();
            toast.success("Login Successful");
        } catch (error) {
            if (signedIn) {
                clearSession(dispatch);
                dispatch({ type: "GET_USER_CART_PRODUCTS", payload: guestCart, totalPrice: 0, cartId: null });
                localStorage.setItem("cartItems", JSON.stringify(guestCart));
                dispatch(selectCartItems(guestSelection));
                await api.post("/auth/signout");
            }
            toast.error(error?.response?.data?.message || "Could not sign in and load your cart. Please retry.");
        } finally {
            setLoader(false);
        }
    }

export const registerNewUser
    = (sendData, toast, reset, navigate, setLoader, returnToCart = false) => async () => {
        try {
            setLoader(true);
            const { data } = await api.post(`/auth/signup`, sendData);
            reset();
            toast.success(data?.message || "User Registered Successful");
            navigate(returnToCart ? "/login?checkout=1" : "/login");
        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.message || error?.response?.data?.password || "Internal Server Error");

        } finally {
            setLoader(false);
        }

    }

export const logOutUser = (navigate) => async (dispatch, getState) => {
    if (getState().carts.isSaving) {
        notifications.error("Please wait for your cart update before signing out");
        return;
    }
    try {
        await api.post("/auth/signout");
        clearSession(dispatch);
        navigate("/login");
    } catch {
        notifications.error("Could not sign out. Please try again.");
    }
};

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


export const getUserAddresses = () => async (dispatch) => {
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
    localStorage.removeItem("client-secret");
    localStorage.setItem("CHECKOUT_ADDRESS", JSON.stringify(address));
    return {
        type: "SELECT_CHECKOUT_ADDRESS",
        payload: address,
    }
}

export const deleteUserAddress =
    (toast, addressId, setOpenDeleteModal) => async (dispatch) => {
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

export const createUserCart = (sendCartItems) => async (dispatch) => {
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
    const userId = getState().auth.user?.id;
    try {
        dispatch({ type: "IS_FETCHING" });
        const { data } = await api.get(`/carts/users/cart`);
        if (getState().auth.user?.id !== userId) return false;
        dispatch({
            type: 'GET_USER_CART_PRODUCTS',
            payload: data.products,
            totalPrice: data.totalPrice,
            cartId: data.cartId,
        })
        localStorage.setItem("cartItems", JSON.stringify(getState().carts.cart));
        dispatch({ type: "IS_SUCCESS" });
        return true;
    } catch (error) {
        if (getState().auth.user?.id !== userId) return false;
        console.log(error);
        dispatch({ type: "IS_ERROR", payload: error?.response?.data?.message || "Failed to fetch cart items" });
        return false;
    }
}

export const createStripePaymentSecret
    = (sendData, toast) => async (dispatch, getState) => {
        const address = getState().auth.selectedUserCheckoutAddress;
        const cart = getState().carts.cart;
        const selection = getState().carts.selectedIds;
        try {
            dispatch({ type: "IS_FETCHING" });
            const { data } = await api.post(`/order/stripe-client-secret`, sendData);
            if (getState().auth.selectedUserCheckoutAddress === address && getState().carts.cart === cart && getState().carts.selectedIds === selection) {
                dispatch({ type: "CLIENT_SECRET", payload: data });
                localStorage.setItem("client-secret", JSON.stringify(data));
            }
            dispatch({ type: "IS_SUCCESS" });
        } catch (error) {
            const message = error?.response?.data?.message || "Could not start payment. Please try again.";
            dispatch({ type: "IS_ERROR", payload: message });
            toast.error(message);
        }
    }

export const stripePaymentConfirmation
    = (sendData, setErrorMessage, setLoading, toast) => async (dispatch) => {
        setLoading(true);
        try {
            const response = await api.post(`/order/users/payments/online`, sendData);
            if (response.data) {
                localStorage.removeItem("CHECKOUT_ADDRESS");
                localStorage.removeItem("client-secret");
                dispatch({ type: "REMOVE_CLIENT_SECRET_ADDRESS" });
                await dispatch(getUserCart());
                if (response.data.orderStatus !== "Paid, needs attention") {
                    dispatch(selectCartItems([]));
                    toast.success("Order Accepted");
                }
                return response.data;
            } else {
                setErrorMessage("Payment Failed. Please try agian.");
            }
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Could not confirm your order. Please retry.");
        } finally {
            setLoading(false);
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
            const { data } = await api.put(`/admin/orders/${orderId}/status`, { status: orderStatus });
            toast.success(data.message || "Order updated successfully");
            const { pageNumber, pageSize } = getState().order.pagination;
            await dispatch(getDashboardOrders(`pageNumber=${pageNumber}&pageSize=${pageSize}`, isAdmin));
            dispatch({ type: "IS_SUCCESS" });
            return true;

        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.message || "Internal Server Error");
            return false;

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
    async (dispatch) => {
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
