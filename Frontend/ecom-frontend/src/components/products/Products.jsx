import { FiAlertCircle, FiSearch, FiShoppingBag, FiArrowRight } from "react-icons/fi";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../shared/ProductCard";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchCategories } from "../../store/actions/index";
import Filter from "./Filter";
import useProductFilter from "../../hooks/useProductFilter";
import Paginations from "../shared/Pagination";

const Products = () => {
    const {isLoading, errorMessage} = useSelector(state => state.errors);
    const {products, categories, pagination} = useSelector(state => state.products);
    const {cart} = useSelector(state => state.carts);
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    useProductFilter();
    useEffect(() => { dispatch(fetchCategories()); }, [dispatch]);
    const keyword = searchParams.get("keyword");
    const category = searchParams.get("category");
    const firstResult = pagination?.pageNumber * pagination?.pageSize + 1;
    const lastResult = firstResult + (products?.length || 0) - 1;

    return (
        <main className="min-h-[calc(100vh-70px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-12 lg:px-14">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">The collection</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Find your next favorite.</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-500">Explore our products and make a little room for something new.</p>
                    </div>
                    <Link to="/cart" className="inline-flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-blue-600">
                        <FiShoppingBag aria-hidden="true" /> View cart <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{cart.length}</span><FiArrowRight aria-hidden="true" />
                    </Link>
                </header>
                <Filter categories={categories || []} />
                <div className="mb-5 mt-7 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">{keyword ? `Results for “${keyword}”` : category || "All products"}</h2>
                    {!isLoading && !errorMessage && products?.length > 0 && <p className="text-sm text-slate-500">Showing {firstResult}–{lastResult} of {pagination.totalElements} products</p>}
                </div>
                {isLoading ? <div role="status" aria-label="Loading products" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[0, 1, 2, 3].map(item => <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 motion-safe:animate-pulse"><div className="aspect-square rounded-xl bg-slate-100" /><div className="mt-5 h-5 w-3/4 rounded bg-slate-100" /><div className="mt-3 h-4 w-1/2 rounded bg-slate-100" /><div className="mt-6 h-12 rounded-xl bg-slate-100" /></div>)}
                </div> : errorMessage ? <div role="alert" className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
                    <FiAlertCircle aria-hidden="true" className="mx-auto mb-4 text-3xl text-slate-400" /><h2 className="text-xl font-semibold text-slate-900">Products could not be loaded</h2>
                    <p className="mt-2 text-sm text-slate-600">{errorMessage}</p><button onClick={() => window.location.reload()} className="mt-5 min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Try again</button>
                </div> : products?.length ? <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {products.map(item => <ProductCard key={item.productId} {...item} />)}
                    </div>
                    {pagination?.totalPages > 1 && <div className="mt-10 flex justify-center border-t border-slate-200 pt-7 [&_.Mui-selected]:!bg-slate-900 [&_.Mui-selected]:!text-white [&_.MuiPaginationItem-root]:!min-h-11 [&_.MuiPaginationItem-root]:!min-w-11">
                        <Paginations numberOfPage={pagination.totalPages} totalProducts={pagination.totalElements} />
                    </div>}
                </> : <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                    <FiSearch aria-hidden="true" className="mx-auto mb-4 text-3xl text-slate-400" />
                    <h2 className="text-xl font-semibold text-slate-900">No products found</h2><p className="mt-2 text-sm text-slate-500">Try a different search or explore all categories.</p>
                    <button onClick={() => setSearchParams({})} className="mt-6 min-h-12 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Clear filters</button>
                </div>}
            </div>
        </main>
    );
};
export default Products;
