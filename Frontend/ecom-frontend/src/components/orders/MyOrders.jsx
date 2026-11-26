import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiArrowLeft, FiArrowRight, FiPackage } from "react-icons/fi";
import api from "../../api/api";
import { formatPrice } from "../../utils/formatPrice";

const MyOrders = () => {
    const { orderId } = useParams();
    const [params] = useSearchParams();
    const page = params.get("page");
    const { user } = useSelector(state => state.auth);
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: "" });
    const key = `${user.id}:${orderId || "list"}:${page || ""}:${attempt}`;
    const listUrl = `/profile/orders${page ? `?page=${encodeURIComponent(page)}` : ""}`;
    const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

    useEffect(() => {
        const controller = new AbortController();
        const query = new URLSearchParams();
        if (page !== null) {
            const number = Number(page);
            if (!Number.isSafeInteger(number) || number < 1) {
                setResult({ key, data: null, error: "Invalid page number. Return to your orders to start again." });
                return;
            }
            query.set("pageNumber", String(number - 1));
        }
        api.get(orderId ? `/orders/${orderId}` : `/orders?${query}`, { signal: controller.signal })
            .then(({ data }) => setResult({ key, data, error: "" }))
            .catch(error => {
                if (controller.signal.aborted) return;
                const status = error.response?.status;
                setResult({ key, data: null, error: status === 404 ? "This order is unavailable or does not belong to your account."
                    : status === 401 ? "Your session has expired. Please sign in again."
                    : "We could not load your orders. Please try again." });
            });
        return () => controller.abort();
    }, [key, orderId, page]);

    const loading = result.key !== key;
    const data = result.data;
    return (
        <main className="min-h-[calc(100vh-70px)] bg-slate-50 px-4 py-10 sm:px-8">
            <div className="mx-auto max-w-5xl">
                <Link to={orderId ? listUrl : "/profile"} className={`${button} mb-6`}>
                    <FiArrowLeft aria-hidden="true" /> {orderId ? "Back to orders" : "Back to profile"}
                </Link>
                <div className="mb-8">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-500">Your account</p>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{orderId ? `Order #${orderId}` : "My Orders"}</h1>
                    <p className="mt-2 text-slate-600">{orderId ? "Your purchase details, all in one place." : "Your purchases, from the latest to the first."}</p>
                </div>
                {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">Loading your orders…</div>
                    : result.error ? <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8">
                        <p className="mb-4 text-red-700">{result.error}</p>
                        <button className={button} onClick={() => setAttempt(attempt + 1)}>Try again</button>
                        <Link to="/profile/orders" className={`${button} ml-3`}>All orders</Link>
                    </div>
                    : orderId ? <>
                        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" aria-label="Order details">
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                                <span className="text-slate-600">Placed on <time dateTime={data.orderDate}>{data.orderDate}</time></span>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">{data.orderStatus}</span>
                            </div>
                            {data.orderStatus === "Paid, needs attention" && <p role="status" className="mb-5 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">Payment received. Some items are unavailable. Your cart has been kept. Please contact support with your order number and do not pay for these items again.</p>}
                            {data.snapshotBackfilled && <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">Historical record: product details and address were backfilled from available records and may differ from the original purchase.</p>}
                            <h2 className="mb-4 text-xl font-semibold text-slate-900">Items purchased</h2>
                            <div className="divide-y divide-slate-100">
                                {data.orderItems.map(item => <div key={item.orderItemId} className="flex items-start gap-4 py-5">
                                    <img src={item.product.image} alt={item.product.productName} className="h-20 w-20 flex-none rounded-lg bg-slate-50 object-contain" />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="break-words font-medium text-slate-900">{item.product.productName}</h3>
                                        <p className="mt-1 text-sm text-slate-600">Quantity: {item.quantity}</p>
                                        <p className="text-sm text-slate-600">Unit price: {formatPrice(item.orderedProductPrice)}</p>
                                        <p className="mt-2 font-semibold text-slate-900">{formatPrice(item.orderedProductPrice * item.quantity)}</p>
                                    </div>
                                </div>)}
                            </div>
                            <div className="flex justify-between gap-4 border-t border-slate-200 pt-5 text-lg font-semibold text-slate-900">
                                <span>Total paid</span><span>{formatPrice(data.totalAmount)}</span>
                            </div>
                        </section>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <section className="rounded-2xl border border-slate-200 bg-white p-6">
                                <h2 className="mb-3 text-lg font-semibold text-slate-900">Shipping address</h2>
                                {data.address ? <address className="break-words not-italic leading-7 text-slate-600">
                                    <p>{data.address.buildingName}</p><p>{data.address.street}</p>
                                    <p>{data.address.city}, {data.address.state} {data.address.pincode}</p><p>{data.address.country}</p>
                                </address> : <p className="text-slate-600">Address unavailable for this order.</p>}
                            </section>
                            <section className="rounded-2xl border border-slate-200 bg-white p-6">
                                <h2 className="mb-3 text-lg font-semibold text-slate-900">Payment</h2>
                                <p className="text-slate-600">{data.payment?.pgName || "Payment method unavailable"}</p>
                                {data.payment?.pgStatus && <p className="mt-2 text-sm text-slate-600">Status: {data.payment.pgStatus}</p>}
                            </section>
                        </div>
                    </> : <>
                        {!data.content.length ? <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
                            <FiPackage className="mx-auto mb-4 text-4xl text-slate-400" aria-hidden="true" />
                            <h2 className="text-xl font-semibold text-slate-900">{data.totalElements ? "No orders on this page" : "No orders yet"}</h2>
                            <p className="mb-6 mt-2 text-slate-600">{data.totalElements ? "Return to the first page to see your purchases." : "Once you place an order, you can find it here."}</p>
                            <Link className={button} to={data.totalElements ? "/profile/orders" : "/products"}>{data.totalElements ? "First page" : "Browse products"}</Link>
                        </section> : <div className="space-y-5">
                            {data.content.map(order => <article key={order.orderId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                                    <div><h2 className="font-semibold text-slate-900">Order #{order.orderId}</h2><time className="text-sm text-slate-500" dateTime={order.orderDate}>{order.orderDate}</time></div>
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">{order.orderStatus}</span>
                                </header>
                                <div className="p-5 sm:p-6">
                                    <div className="mb-5 space-y-3">
                                        {order.orderItems.slice(0, 3).map(item => <div key={item.orderItemId} className="flex items-center gap-4">
                                            <img src={item.product.image} alt={item.product.productName} loading="lazy" className="h-16 w-16 flex-none rounded-lg bg-slate-50 object-contain" />
                                            <div className="min-w-0"><p className="break-words font-medium text-slate-800">{item.product.productName}</p><p className="text-sm text-slate-500">Quantity: {item.quantity}</p></div>
                                        </div>)}
                                        {order.orderItems.length > 3 && <p className="text-sm text-slate-500">+{order.orderItems.length - 3} more products</p>}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                                        <p className="text-sm text-slate-600">Total paid <strong className="ml-2 text-lg text-slate-900">{formatPrice(order.totalAmount)}</strong></p>
                                        <Link aria-label={`View order ${order.orderId}`} to={`/profile/orders/${order.orderId}${page ? `?page=${encodeURIComponent(page)}` : ""}`} className={button}>View details <FiArrowRight aria-hidden="true" /></Link>
                                    </div>
                                </div>
                            </article>)}
                        </div>}
                        {data.totalPages > 1 && <nav aria-label="Order pages" className="mt-8 flex flex-wrap items-center justify-between gap-3">
                            {data.pageNumber > 0 ? <Link className={button} to={`?page=${data.pageNumber}`}>Previous</Link> : <span />}
                            <p className="text-sm text-slate-600">Page {data.pageNumber + 1} of {data.totalPages}</p>
                            {!data.lastPage && <Link className={button} to={`?page=${data.pageNumber + 2}`}>Next</Link>}
                        </nav>}
                    </>}
            </div>
        </main>
    );
};

export default MyOrders;
