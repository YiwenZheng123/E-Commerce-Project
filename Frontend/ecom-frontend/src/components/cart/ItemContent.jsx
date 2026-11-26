import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { increaseCartQuantity, decreaseCartQuantity, removeFromCart } from "../../store/actions";
import toast from "react-hot-toast";
import { formatPrice } from "../../utils/formatPrice";

const ItemContent = ({ productId, productName, image, quantity, price, specialPrice, stock, selected, onSelect, isSaving }) => {
    const dispatch = useDispatch();
    const quantityButton = "flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:text-slate-300";
    return (
        <article className={`rounded-2xl border bg-white p-4 transition-colors sm:p-5 ${selected ? "border-slate-300 shadow-sm" : "border-slate-200"}`}>
            <div className="flex items-start gap-3 sm:gap-5">
                <label className="-ml-2 flex min-h-11 w-9 flex-none cursor-pointer items-center justify-center sm:ml-0 sm:w-6">
                    <input type="checkbox" aria-label={`Select ${productName}`} checked={selected} onChange={event => onSelect(event.target.checked)}
                        className="h-5 w-5 cursor-pointer accent-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" />
                </label>
                <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:gap-5">
                    <div className="flex items-start gap-4 sm:contents">
                        <div className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-2 sm:h-32 sm:w-32 sm:p-3">
                            <img src={image} alt={productName} loading="lazy" className="h-full w-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1 sm:hidden">
                            <h2 className="break-words text-sm font-semibold leading-6 text-slate-900">{productName}</h2>
                            <p className="mt-2 text-sm font-medium text-slate-700">{formatPrice(Number(specialPrice))}</p>
                            {price > specialPrice && <p className="text-xs text-slate-400 line-through">{formatPrice(Number(price))}</p>}
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="hidden sm:block">
                            <h2 className="break-words text-base font-semibold leading-6 text-slate-900">{productName}</h2>
                            <div className="mt-2 flex items-center gap-2 text-sm"><span className="font-medium text-slate-700">{formatPrice(Number(specialPrice))}</span>{price > specialPrice && <span className="text-slate-400 line-through">{formatPrice(Number(price))}</span>}<span className="text-slate-400">each</span></div>
                        </div>
                        {quantity > stock && <p className="mt-2 text-xs leading-5 text-red-600" role="alert">Only {stock} available. Reduce quantity to continue.</p>}
                        <div className="flex flex-wrap items-center justify-between gap-3 sm:mt-5">
                            <div className="inline-flex items-center rounded-xl border border-slate-200 p-0.5" role="group" aria-label={`Quantity for ${productName}`}>
                                <button className={quantityButton} disabled={isSaving || quantity <= 1} aria-label={`Decrease quantity of ${productName}`}
                                    onClick={() => dispatch(decreaseCartQuantity({productId}, quantity - 1))}><FiMinus aria-hidden="true" /></button>
                                <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-slate-900">{quantity}</span>
                                <button className={quantityButton} disabled={isSaving || stock == null || quantity >= stock} aria-label={`Increase quantity of ${productName}`}
                                    onClick={() => dispatch(increaseCartQuantity({productId}, toast, quantity, () => {}))}><FiPlus aria-hidden="true" /></button>
                            </div>
                            <div className="text-right"><p className="text-xs text-slate-400">Item total</p><p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{formatPrice(Number(quantity) * Number(specialPrice))}</p></div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-500">{selected ? "Included in checkout" : "Keeping for later"}</span>
                            <button disabled={isSaving} aria-label={`Remove ${productName}`} onClick={() => dispatch(removeFromCart({productId, productName}, toast))}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
                                <FiTrash2 aria-hidden="true" /> Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default ItemContent;
