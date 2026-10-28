import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom"
import { fetchProducts } from "../store/actions/index";
import { dashboardProductsAction } from "../store/actions/index";

const useProductFilter = () => {
    const [searchParams] = useSearchParams();
    const dispatch = useDispatch();

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        const currentPage = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
        params.set("pageNumber", currentPage-1);

        const sortOrder = searchParams.get("sortBy") || "asc";
        const categoryParams = searchParams.get("category") || null;
        const keyword= searchParams.get("keyword") || null;

        params.set("sortBy", "price");
        params.set("sortOrder", sortOrder);

        if (categoryParams) {
            params.set("category", categoryParams);
        }

        if (keyword) {
            params.set("keyword", keyword);
        }

        const queryString = params.toString();
        console.log("QUERY_STRING", queryString);
        dispatch(fetchProducts(queryString));
        
        
    }, [dispatch, searchParams]);




}

export const useDashboardProductFilter = () => {
    const [searchParams] = useSearchParams();
    const dispatch = useDispatch();
    const {user} = useSelector((state) => state.auth);
    const isAdmin = user && user?.roles.includes("ROLE_ADMIN");
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        const currentPage = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
        params.set("pageNumber", currentPage-1);
        const queryString = params.toString();
        dispatch(dashboardProductsAction(queryString, isAdmin));
        
        
    }, [dispatch, searchParams]);




}


export default useProductFilter;
