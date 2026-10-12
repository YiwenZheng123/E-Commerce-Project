import { useState} from "react";
import { useDispatch } from "react-redux";
import { FaShoppingCart } from "react-icons/fa";
import ProductViewModal from "./ProductViewModal";
import truncateText from "../../utils/truncateText";
import { addToCart } from "../../store/actions";
import toast from "react-hot-toast";
const ProductCard = (
    {   productId, 
        productName, 
        image, 
        description, 
        stock, 
        price, 
        discount, 
        specialPrice,
        about = false,
     }
) => {
    const [openProductViewModal, setOpenProductViewModal] = useState(false);
    const btnLoader = false;
    const[selectedViewProduct, setSelectedViewProduct] = useState("");
    const isAvailable = stock && Number(stock) > 0;
    const dispatch = useDispatch();
    const handleProductView = (product) => {
        if(!about){
            setSelectedViewProduct(product);
            setOpenProductViewModal(true);
        }
        
    }

    const addToCartHandler = (cartItems) => {
        dispatch(addToCart(cartItems,1,toast));

    }
    return (
        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border shadow-xl transition-shadow duration-300">
            <div onClick = {() => {
                handleProductView({
                        id: productId,
                        productName,
                        image,
                        description,
                        stock,
                        price,
                        discount,
                        specialPrice
                })
            }} className = "w-full overflow-hidden aspect-[3/2]">
                <img 
                className="h-full w-full cursor-pointer object-contain transition-transform duration-300 hover:scale-105"
                src = {image}
                alt = {productName}> 
                </img>

            </div>
            <div className="flex flex-1 flex-col p-4">
                <h2 onClick = {() => {
                    handleProductView({
                        id: productId,
                        productName,
                        image,
                        description,
                        stock,
                        price,
                        discount,
                        specialPrice
                    })
                }} 
                    className="mb-2 cursor-pointer break-words text-lg font-semibold">
                    {truncateText(productName,50)}
                </h2>
                <div className = "min-h-20 max-h-20">
                    <p className="line-clamp-3 break-words text-sm text-gray-600">
                        {truncateText(description, 80)}
                    </p>
                </div>
                {!about && (
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    {specialPrice ? (<div className = "flex flex-col">
                        <span className = "text-gray-400 line-through">
                            ${Number(price).toFixed(2)}
                        </span>
                        <span className = "text-xl font-bold text-slate-700">
                            ${Number(specialPrice).toFixed(2)}
                        </span>
                    </div>) : (
                        <span className = "text-xl font-bold text-slate-700">
                            ${Number(price).toFixed(2)}
                        </span>

                    )}
                    <button
                        disabled = {!isAvailable || btnLoader}
                        onClick = {() => addToCartHandler({
                            productId,
                            productName,
                            image,
                            description,
                            stock,
                            price,
                            discount,
                            specialPrice
                        })}
                        className = {`cursor-pointer bg-blue-500 ${isAvailable ? "opacity-100 hover:bg-blue-600" : "opacity-70"}
                        text-white py-2 px-3 rounded-lg items-center transition-colors duration-300 w-36 flex justify-center`}>
                        <FaShoppingCart className="mr-2"/>
                        {isAvailable ? "Add to Cart" : "Stock Out"}
                    </button>        
                
                </div>

                )}
                
            
            </div>
            <ProductViewModal 
                open = {openProductViewModal}
                setOpen = {setOpenProductViewModal}
                product = {selectedViewProduct}
                isAvailable = {isAvailable}
            />

        </div>
    )
}

export default ProductCard;
