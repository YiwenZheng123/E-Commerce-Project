import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { Alert, Button } from '@mui/material'
import api from '../../api/api'
import { getUserCart } from '../../store/actions'
import toast from 'react-hot-toast'

const PaypalPayment = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, selectedUserCheckoutAddress } = useSelector((state) => state.auth);
    const pendingKey = `paypal-pending-${user.id}`;
    const [pendingOrder, setPendingOrder] = useState(() => localStorage.getItem(pendingKey));
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

    const captureOrder = async (orderId) => {
        setLoading(true);
        setErrorMessage('');
        try {
            await api.post(`/order/paypal/${orderId}/capture`);
            localStorage.removeItem(pendingKey);
            localStorage.removeItem('CHECKOUT_ADDRESS');
            dispatch({ type: 'REMOVE_CLIENT_SECRET_ADDRESS' });
            await dispatch(getUserCart());
            toast.success('Order Accepted');
            navigate('/order-confirm');
        } catch (error) {
            if (error?.response?.data?.message === 'INSTRUMENT_DECLINED') {
                localStorage.removeItem(pendingKey);
                setPendingOrder(null);
                setErrorMessage('PayPal declined the payment method. Please choose another one.');
                return 'declined';
            }
            if (error?.response?.data?.message === 'A product is out of stock. Please update your cart before paying.') {
                localStorage.removeItem(pendingKey);
                setPendingOrder(null);
                setErrorMessage(error.response.data.message);
                return;
            }
            setPendingOrder(orderId);
            setErrorMessage(error?.response?.data?.message || 'Could not confirm payment. Please retry confirmation before making another payment.');
        } finally {
            setLoading(false);
        }
    }

    if (!clientId) {
        return <Alert severity='warning' className='max-w-lg mx-auto'>PayPal sandbox is not configured.</Alert>;
    }

    return (
        <div className='max-w-lg mx-auto p-4 space-y-4'>
            <h2 className='text-xl font-semibold text-slate-800'>Pay with PayPal</h2>
            <p className='text-sm text-slate-600'>Your total includes 13% tax. Complete your payment in the PayPal sandbox.</p>
            {errorMessage && <Alert severity='error'>{errorMessage}</Alert>}
            {pendingOrder ? (
                <div className='space-y-3'>
                    <p className='text-sm text-slate-600'>A PayPal payment is awaiting confirmation. Retry to check its status.</p>
                    <Button variant='contained' disabled={loading} onClick={() => captureOrder(pendingOrder)}>
                        {loading ? 'Checking payment...' : 'Retry confirmation'}
                    </Button>
                </div>
            ) : (
                <PayPalScriptProvider options={{ clientId, currency: 'USD', intent: 'capture' }}>
                    <PayPalButtons
                        createOrder={async () => {
                            const { data } = await api.post('/order/paypal', { addressId: selectedUserCheckoutAddress.addressId });
                            return data.id;
                        }}
                        onApprove={async (data, actions) => {
                            localStorage.setItem(pendingKey, data.orderID);
                            const result = await captureOrder(data.orderID);
                            if (result === 'declined') return actions.restart();
                        }}
                        onError={() => setErrorMessage('PayPal could not start the payment. Please try again.')}
                    />
                </PayPalScriptProvider>
            )}
        </div>
    )
}

export default PaypalPayment
