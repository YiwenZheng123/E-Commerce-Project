import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom"
import { fetchCategories } from "../store/actions/index";
import { dashboardCategoriesAction } from "../store/actions/index";

const useCategoryFilter = () => {
    const [searchParams] = useSearchParams();
    const dispatch = useDispatch();

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        const page = Number(searchParams.get("page") ?? 1);
        const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
        params.set("pageNumber", currentPage - 1);

        dispatch(fetchCategories());
    }, [dispatch, searchParams]);
}

export const useDashboardCategoryFilter = () => {
    const [searchParams] = useSearchParams();
    const dispatch = useDispatch();

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        const currentPage = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
        params.set("pageNumber", currentPage - 1);
        const queryString = params.toString();
        dispatch(dashboardCategoriesAction(queryString));


    }, [dispatch, searchParams]);




}

export default useCategoryFilter;