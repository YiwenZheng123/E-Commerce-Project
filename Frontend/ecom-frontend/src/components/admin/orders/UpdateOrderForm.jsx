import { Button, FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material'
import { useState } from 'react'
import  Spinners  from '../../shared/Spinners'
import { useDispatch } from 'react-redux'
import { updateOrderStatusFromDashboard } from '../../../store/actions'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'

const UpdateOrderForm = ({ setOpen, selectedId, selectedItem, loader, setLoader }) => {
    const nextStatus = { Accepted: "Processing", Processing: "Shipped", Shipped: "Delivered" }[selectedItem?.status];
    const [orderStatus, setOrderStatus] = useState(nextStatus || "");
    const [error, setError] = useState("");
    const {user} = useSelector((state) => state.auth)
    const isAdmin = user && user?.roles?.includes("ROLE_ADMIN")
    const dispatch = useDispatch();
    const updateOrderStatus = (e) => {
        e.preventDefault();
        if (!orderStatus) {
            setError("Order status is required");
            return;
        
        }
        dispatch(updateOrderStatusFromDashboard(selectedId, orderStatus, toast, setLoader, isAdmin))
            .then(success => { if (success) setOpen(false); });
    }
    return (
        <div className='py-5 relative h-full'>
            <form className='space-y-4' onSubmit={updateOrderStatus}>
                {!nextStatus && <p className="text-slate-600">This order has no available status changes. Paid orders needing attention require separate support review.</p>}
                {nextStatus && <FormControl fullWidth variant='outlined' error={!!error}>
                    <InputLabel id="order-status-label">Order Status</InputLabel>
                    <Select
                        labelId='order-status-label'
                        label='Order Status'
                        value={orderStatus}
                        onChange={(e) => {
                            setOrderStatus(e.target.value);
                            setError("");

                        }}
                    >
                        <MenuItem value={nextStatus}>{nextStatus}</MenuItem>

                    </Select>
                    {error && <FormHelperText>{error}</FormHelperText>}


                </FormControl>}

                <div className='flex w-full justify-between items-center absolute bottom-14'>
                    <Button
                        disabled={loader}
                        onClick={() => setOpen(false)}
                        variant='outlined'
                        className='text-white py-2.5 px-4 text-sm font-medium'
                    >
                        Cancel
                    </Button>

                    <Button
                        disabled={loader || !nextStatus}
                        type='submit'
                        variant='contained'
                        color='primary'
                        className='bg-custom-blue text-white py-2.5 px-4 text-sm font-medium'>
                            {loader ? (
                                <div className='flex gap-2 items-center'>
                                    <Spinners /> Loading...
                                </div>
                            ) : (
                                "Update"
                                
                            )}
                    </Button>
                </div>

            </form>

        </div>
    )
}

export default UpdateOrderForm