import { useState, useEffect } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";

const Filter = ({categories}) => {
    const [searchParams] = useSearchParams();
    const pathname = useLocation().pathname;
    const navigate = useNavigate();
    const category = searchParams.get("category") || "all";
    const sortOrder = searchParams.get("sortBy") || "asc";
    const keyword = searchParams.get("keyword") || "";
    const [searchTerm, setSearchTerm] = useState(keyword);
    const [prevKeyword, setPrevKeyword] = useState(keyword);

    // Keep the input in sync when the URL keyword changes (e.g. back button or "clear").
    // Adjusting state during render avoids the extra render pass an effect would cause.
    if (keyword !== prevKeyword) {
        setPrevKeyword(keyword);
        setSearchTerm(keyword);
    }
    useEffect(() => {
        if (searchTerm === keyword) return;
        const handler = setTimeout(() => {
            const params = new URLSearchParams(searchParams);
            if (searchTerm.trim()) params.set("keyword", searchTerm.trim());
            else params.delete("keyword");
            params.delete("page");
            navigate(`${pathname}?${params}`);
        }, 700);
        return () => clearTimeout(handler);
    }, [searchTerm, keyword, searchParams, navigate, pathname]);

    const handleCategoryChange = (event) => {
        const params = new URLSearchParams(searchParams);
        if (event.target.value === "all") params.delete("category");
        else params.set("category", event.target.value);
        params.delete("page");
        navigate(`${pathname}?${params}`);
    };
    const handleSortChange = (event) => {
        const params = new URLSearchParams(searchParams);
        params.set("sortBy", event.target.value);
        params.delete("page");
        navigate(`${pathname}?${params}`);
    };
    const handleClearFilters = () => {
        setSearchTerm("");
        navigate(pathname);
    };

    const fieldStyle = "min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-slate-400 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600";
    return (
        <section aria-label="Product filters" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_210px_auto]">
                <div className="sm:col-span-2 lg:col-span-1">
                    <label htmlFor="product-search" className="mb-2 block text-xs font-semibold text-slate-600">Search products</label>
                    <div className="relative">
                        <FiSearch aria-hidden="true" className="pointer-events-none absolute left-4 top-4 text-slate-400" />
                        <input id="product-search" type="search" placeholder="What are you looking for?" value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)} className={`${fieldStyle} pl-11`} />
                    </div>
                </div>
                <div>
                    <label htmlFor="product-category" className="mb-2 block text-xs font-semibold text-slate-600">Category</label>
                    <select id="product-category" value={category} onChange={handleCategoryChange} className={fieldStyle}>
                        <option value="all">All categories</option>
                        {categories.map(item => <option key={item.categoryId} value={item.categoryName}>{item.categoryName}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="product-sort" className="mb-2 block text-xs font-semibold text-slate-600">Sort by</label>
                    <select id="product-sort" value={sortOrder} onChange={handleSortChange} className={fieldStyle}>
                        <option value="asc">Price: low to high</option>
                        <option value="desc">Price: high to low</option>
                    </select>
                </div>
                <button onClick={handleClearFilters} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 sm:col-span-2 lg:col-span-1">
                    <FiX aria-hidden="true" /> Reset
                </button>
            </div>
        </section>
    );
};

export default Filter;
