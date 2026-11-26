import { FiArrowLeft, FiArrowRight, FiShoppingBag } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ItemContent from "./ItemContent";
import CartEmpty from "./CartEmpty";
import { formatPrice } from "../../utils/formatPrice";
import { selectCartItems } from "../../store/actions";

const Cart = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const {user} = useSelector((state) => state.auth);
    const {cart, selectedIds = [], isSaving} = useSelector((state) => state.carts);
    if(!cart || cart.length === 0) return <CartEmpty/>;
    const selectedItems = cart.filter(item => selectedIds.includes(item.productId));
    const selectedQuantity = selectedItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    const subtotal = selectedItems.reduce((sum, item) => sum + Number(item.specialPrice) * Number(item.quantity), 0);
    const allSelected = selectedItems.length === cart.length;
    const stockExceeded = selectedItems.some(item => item.quantity > item.stock);

    return (
        <main className="min-h-[calc(100vh-70px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-12 lg:px-14">
            <div className="mx-auto max-w-7xl">
                <Link to="/products" className="mb-6 inline-flex min-h-11 items-center gap-2 rounded text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                    <FiArrowLeft aria-hidden="true" /> Continue shopping
                </Link>
                <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">A little closer to yours</p>
                        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Your cart <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-base font-medium text-slate-600">{cart.length}</span></h1>
                        <p className="mt-3 text-sm leading-6 text-slate-500">Choose what you want to buy today. Keep the rest for later.</p>
                    </div>
                </header>
                <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
                    <section aria-label="Cart products" className="min-w-0">
                        <div className="mb-4 flex items-center justify-between gap-3 px-1">
                            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
                                <input type="checkbox" checked={allSelected} ref={input => { if (input) input.indeterminate = selectedItems.length > 0 && !allSelected; }}
                                    onChange={event => dispatch(selectCartItems(event.target.checked ? cart.map(item => item.productId) : []))}
                                    className="h-5 w-5 cursor-pointer rounded accent-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" />
                                Select all
                            </label>
                            <span className="text-sm text-slate-500">{selectedItems.length} of {cart.length} selected</span>
                        </div>
                        <div className="space-y-4">
                            {cart.map(item => <ItemContent key={item.productId} {...item} selected={selectedIds.includes(item.productId)} isSaving={isSaving}
                                onSelect={checked => dispatch(selectCartItems(checked ? [...selectedIds, item.productId] : selectedIds.filter(id => id !== item.productId)))} />)}
                        </div>
                    </section>
                    <aside aria-label="Order summary" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
                        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900"><FiShoppingBag aria-hidden="true" className="text-slate-500" /> Order summary</h2>
                        <p className="mt-2 text-sm text-slate-500">Only your selected items are included.</p>
                        <dl className="mt-7 space-y-4 text-sm">
                            <div className="flex justify-between gap-4"><dt className="text-slate-500">Selected quantity</dt><dd className="font-medium text-slate-900">{selectedQuantity} {selectedQuantity === 1 ? "item" : "items"}</dd></div>
                            <div className="flex justify-between gap-4 border-t border-slate-100 pt-5"><dt className="font-semibold text-slate-900">Subtotal</dt><dd className="text-2xl font-semibold tracking-tight text-slate-900" aria-live="polite">{formatPrice(subtotal)}</dd></div>
                        </dl>
                        <p className="mt-3 text-xs leading-5 text-slate-500">Taxes calculated at checkout.</p>
                        <button disabled={isSaving || !selectedItems.length || stockExceeded}
                            onClick={() => navigate(user ? "/checkout" : "/login?checkout=1")}
                            className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
                            {isSaving ? "Updating cart..." : "Checkout"} <FiArrowRight aria-hidden="true" />
                        </button>
                        <p className={`mt-4 text-center text-xs leading-5 ${stockExceeded ? "text-red-600" : "text-slate-500"}`}>
                            {stockExceeded ? "Adjust quantities to match available stock." : !selectedItems.length ? "Select an item to continue to checkout." : !user ? "Sign in at the next step to continue." : "Unselected items will stay in your cart."}
                        </p>
                    </aside>
                </div>
            </div>
        </main>
    );
};

export default Cart;
