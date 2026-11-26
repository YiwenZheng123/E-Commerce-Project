import React, { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Skeleton } from '@mui/material'
import { stripePaymentConfirmation } from '../../store/actions'
import toast from 'react-hot-toast'
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import api from '../../api/api'

const PaymentConfirmation = () => {
    const submitted = useRef(false);
    const loaction = useLocation();
    const searchParams = new URLSearchParams(loaction.search);
    const dispatch = useDispatch();
    const [errorMessage, setErrorMessage] = useState("");
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const paymentIntent = searchParams.get("payment_intent");
    const orderId = searchParams.get("orderId");
    const clientSecret = searchParams.get("payment_intent_client_secret");
    const redirectStatus = searchParams.get("redirect_status");
    const selectedUserCheckoutAddress = localStorage.getItem("CHECKOUT_ADDRESS")
        ? JSON.parse(localStorage.getItem("CHECKOUT_ADDRESS"))
        : [];

    useEffect(() => {
        const sendData = {
            addressId: selectedUserCheckoutAddress.addressId,
            pgName: "Stripe",
            pgPaymentId: paymentIntent,
            pgStatus: "succeeded",
            pgResponseMessage: "Payment successful"
        };

        if (submitted.current) return;
        submitted.current = true;
        if (paymentIntent && clientSecret && redirectStatus === "succeeded") {
            dispatch(stripePaymentConfirmation(sendData, setErrorMessage, setLoading, toast)).then(setOrder);
        } else if (orderId) {
            api.get(`/orders/${encodeURIComponent(orderId)}`)
                .then(({ data }) => setOrder(data))
                .catch(() => setErrorMessage("Could not load your order. Please check My Orders. Do not pay again."))
                .finally(() => setLoading(false));
        } else {
            setErrorMessage("Payment was not completed. Your cart has been kept.");
            setLoading(false);
        }
    }, [paymentIntent, clientSecret, redirectStatus, orderId, dispatch])

    const attention = order?.orderStatus === "Paid, needs attention";

    return (
        <div className='min-h-screen flex items-center justify-center'>
            {errorMessage ? <div role="alert" className="p-8 text-red-600">{errorMessage}</div> : loading ? (
                <div className='max-w-xl mx-auto'>
                    <Skeleton />
                </div>
            ) : (
                <div className="p-8 rounded-lg shadow-lg text-center max-w-md mx-auto border border-gray-200">
                    <div className={`${attention ? 'text-amber-600' : 'text-green-500'} mb-4 flex justify-center`}>
                        {attention ? <FaExclamationCircle size={64} /> : <FaCheckCircle size={64} />}
                    </div>
                    <h2 className='text-3xl font-bold text-gray-800 mb-2'>{attention ? "Paid, needs attention" : "Payment Successful!"}</h2>
                    <p className="text-gray-600 mb-6">
                        {attention ? "Your payment was received, but some items are unavailable. Your cart has been kept. Please contact support with your order number. Do not pay for these items again."
                            : "Thank you for your purchase! Your payment was successful, and we are processing your order."}
                    </p>
                    {order?.orderId && <Link className="font-medium text-blue-700 underline" to={`/profile/orders/${order.orderId}`}>View order #{order.orderId}</Link>}
                </div>
            )}
        </div>
    )
}

export default PaymentConfirmation
