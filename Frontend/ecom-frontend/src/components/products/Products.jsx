import { FaExclamationTriangle } from "react-icons/fa";
import ProductCard from "../shared/ProductCard";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchCategories} from "../../store/actions/index";
import Filter from "./Filter";
import useProductFilter from "../../hooks/useProductFilter";
import Loader from "../shared/Loader";
import Paginations from "../shared/Pagination";

const Products = () => {
    const {isLoading, errorMessage} = useSelector(
        (state) => state.errors
    );
    const {products, categories, pagination} = useSelector(
        (state) => state.products
    );

    const dispatch = useDispatch();
    useProductFilter();

    useEffect(() => {
        dispatch(fetchCategories());
    }, [dispatch]);
    // const products = [
    //     {
    //     productId: 652,
    //     productName: "Iphone Xs max",
    //     image: "https://placehold.co/600x400",
    //     description: "Experience the latest in mobile technology with advanced cameras, powerful processing, and an all-day battery.",
    //     stock: 1,
    //     price: 1450.0,
    //     discount: 10.0,
    //     specialPrice: 1305.0,
    //     },
    //     {
    //     productId: 654,
    //     productName: "MacBook Air M2s",
    //     image: "https://placehold.co/600x400",
    //     description: "Ultra-thin laptop with Apple's M2 chip, providing fast performance in a lightweight, portable design.",
    //     stock: 0,
    //     price: 2550.0,
    //     discount: 20.0,
    //     specialPrice: 2040.0,
    //     }
    // ];

    return(
        <div className = "lg:px-14 sm:px-8 px-4 py-14 2xl:w-[90%] 2xl:mx-auto">
            <Filter categories={categories ? categories : []}/>
            {isLoading ? (
                <Loader text={"Products Loading"}/>
            ) : errorMessage ? (
                <div className = "flex justify-center items-center h-[200px]">
                    <FaExclamationTriangle className="text-slate-800 text-3xl mr-2" />
                    <span className = "text-slate-800 text-lg">{errorMessage}</span>
                </div>
            ) : (
                <div className="min-h-[700px]">
                    <div className="grid grid-cols-1 gap-6 pb-6 pt-14 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {products && 
                         products.map((item, i) => <ProductCard key={i} {...item} />)
                        }
                    </div>
                    <div className="flex justify-center pt-10">
                        <Paginations 
                            numberOfPage = {pagination?.totalPages}
                            totalProducts = {pagination?.totalElements}
                        />
                        
                    </div>
                   
                </div>
            )
            }
        </div>
    )
}
export default Products;

