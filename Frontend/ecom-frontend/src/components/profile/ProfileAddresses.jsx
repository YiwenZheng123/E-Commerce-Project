import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@mui/material'
import { getUserAddresses } from '../../store/actions'
import AddAddressForm from '../checkout/AddAddressForm'
import AddressInfoModal from '../checkout/AddressInfoModal'
import Loader from '../shared/Loader'

const ProfileAddresses = () => {
    const dispatch = useDispatch();
    const { address } = useSelector((state) => state.auth);
    const { isLoading, errorMessage } = useSelector((state) => state.errors);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [openAddressModal, setOpenAddressModal] = useState(false);

    useEffect(() => {
        dispatch(getUserAddresses());
    }, [dispatch]);

    return (
        <div>
            <div className='flex justify-end mb-5'>
                <Button variant='contained' onClick={() => {
                    setSelectedAddress(null);
                    setOpenAddressModal(true);
                }}>Add Address</Button>
            </div>
            {isLoading ? <Loader /> : errorMessage ? (
                <p role='alert' className='text-red-600'>{errorMessage}</p>
            ) : !address?.length ? (
                <p className='text-slate-500'>No address added yet.</p>
            ) : (
                <div className='space-y-4'>
                    {address.map((item) => (
                        <div key={item.addressId} className='flex items-start justify-between gap-4 border border-slate-200 rounded-md p-4'>
                            <div className='text-slate-700 break-words min-w-0'>
                                <p className='font-semibold'>{item.buildingName}</p>
                                <p>{item.street}</p>
                                <p>{item.city}, {item.state}</p>
                                <p>{item.country}, {item.pincode}</p>
                            </div>
                            <Button variant='outlined' aria-label={`Edit address at ${item.buildingName}`} onClick={() => {
                                setSelectedAddress(item);
                                setOpenAddressModal(true);
                            }}>Edit</Button>
                        </div>
                    ))}
                </div>
            )}
            <AddressInfoModal open={openAddressModal} setOpen={setOpenAddressModal}>
                {openAddressModal && <AddAddressForm key={selectedAddress?.addressId || 'new'}
                    address={selectedAddress} setOpenAddressModal={setOpenAddressModal} />}
            </AddressInfoModal>
        </div>
    )
}

export default ProfileAddresses
