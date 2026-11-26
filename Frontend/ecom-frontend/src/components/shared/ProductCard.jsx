import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiPlus, FiArrowUpRight, FiImage } from "react-icons/fi";
import ProductViewModal from "./ProductViewModal";
import { addToCart } from "../../store/actions";
import { formatPrice } from "../../utils/formatPrice";
import toast from "react-hot-toast";

const ProductCard = ({ productId, productName, image, description, stock, price, discount, specialPrice, about = false }) => {
    const [openProductViewModal, setOpenProductViewModal] = useState(false);
    const [failedImage, setFailedImage] = useState(null);
    const {isSaving} = useSelector(state => state.carts);
    const dispatch = useDispatch();
    const isAvailable = Number(stock) > 0;
    const hasDiscount = specialPrice != null && Number(specialPrice) < Number(price);
    const product = { productId, productName, image, description, stock, price, discount, specialPrice: specialPrice ?? price };

    return (
        <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md motion-reduce:transition-none">
            <div className="relative m-3 overflow-hidden rounded-xl bg-slate-50">
                <button type="button" disabled={about} aria-label={`View ${productName}`} onClick={() => setOpenProductViewModal(true)}
                    className="block aspect-square w-full p-6 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-blue-600 disabled:cursor-default">
                    {image && failedImage !== image ? <img src={image} alt={productName} onError={() => setFailedImage(image)} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none" /> : <span className="flex h-full flex-col items-center justify-center gap-3 text-slate-400"><FiImage aria-hidden="true" className="text-3xl" /><span className="text-xs">Image unavailable</span></span>}
                </button>
                {!about && hasDiscount && <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">Save {Math.round((1 - Number(specialPrice) / Number(price)) * 100)}%</span>}
                {!about && <span className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-slate-200 bg-white p-2 text-slate-500"><FiArrowUpRight aria-hidden="true" /></span>}
            </div>
            <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
                {!about && <p className={`mb-2 flex items-center gap-1.5 text-xs ${isAvailable ? "text-slate-500" : "text-rose-600"}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-rose-400"}`} />{isAvailable ? "In stock" : "Out of stock"}</p>}
                <h2 className="text-base font-semibold leading-6 text-slate-900"><button type="button" disabled={about} onClick={() => setOpenProductViewModal(true)} className="w-full break-words text-left hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-default">{productName}</button></h2>
                <p className="mb-5 mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-500">{description}</p>
                {!about && <div className="mt-auto">
                    <div className="mb-4 flex flex-wrap items-baseline gap-2"><span className="text-xl font-semibold tracking-tight text-slate-900">{formatPrice(Number(specialPrice ?? price))}</span>{hasDiscount && <span className="text-sm text-slate-400 line-through">{formatPrice(Number(price))}</span>}</div>
                    <button disabled={!isAvailable || isSaving} onClick={() => dispatch(addToCart(product, 1, toast))}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
                        {isAvailable && <FiPlus aria-hidden="true" />} {isAvailable ? "Add to cart" : "Out of stock"}
                    </button>
                </div>}
            </div>
            <ProductViewModal open={openProductViewModal} setOpen={setOpenProductViewModal} product={product} isAvailable={isAvailable} />
        </article>
    );
};
export default ProductCard;
