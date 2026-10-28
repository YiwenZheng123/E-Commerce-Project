import React, { useEffect } from 'react'
import InputField from '../shared/InputField'
import { useForm } from 'react-hook-form';
import { FiMapPin } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import  Spinners  from '../shared/Spinners';
import toast from 'react-hot-toast';
import { addUpdateUserAddress } from '../../store/actions/index';


const AddAddressForm = ({ address, setOpenAddressModal }) => {
    const { btnLoader } = useSelector((state) => state.errors);
    const dispatch = useDispatch();
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        mode: "onTouched",

    });

    const onSaveAddressHandler = async (data) => {
        dispatch(addUpdateUserAddress(
            data,
            toast,
            address?.addressId,
            setOpenAddressModal,

        ))


    }
    useEffect(() => {
        if(address?.addressId){
            setValue("buildingName", address?.buildingName);
            setValue("city", address?.city);
            setValue("street", address?.street);
            setValue("state", address?.state);
            setValue("pincode", address?.pincode);
            setValue("country", address?.country);
        }
    }, [address])
    return (
        <div className="">
            <form
                onSubmit={handleSubmit(onSaveAddressHandler)}
                className="[&_input]:min-h-11 [&_input]:border-slate-300 [&_input]:bg-white [&_input]:px-3 [&_input]:text-base [&_input]:transition-colors [&_input:focus]:border-blue-500 [&_input:focus]:outline-2 [&_input:focus]:outline-offset-2 [&_input:focus]:outline-blue-600"
            >
                <div className="flex items-start gap-4 pr-10 pb-6 mb-6 border-b border-slate-100">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-custom-blue">
                        <FiMapPin aria-hidden="true" className="text-xl" />
                    </span>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                            {!address?.addressId ? "Add Address" : "Update Address"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">Enter your shipping address details.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                    <InputField
                        label="Building Name"
                        required
                        id="buildingName"
                        type="text"
                        message="*Building Name is required"
                        placeholder="Enter Building Name"
                        register={register}
                        errors={errors}
                    />
                    <InputField
                        label="City"
                        required
                        id="city"
                        type="text"
                        message="*City is required"
                        placeholder="Enter City"
                        register={register}
                        errors={errors}
                    />

                    <InputField
                        label="State"
                        required
                        id="state"
                        type="text"
                        message="*State is required"
                        placeholder="Enter State"
                        register={register}
                        errors={errors}
                    />

                    <InputField
                        label="Pincode"
                        required
                        id="pincode"
                        type="text"
                        message="*Pincode is required"
                        placeholder="Enter Pincode"
                        register={register}
                        errors={errors}
                    />

                    <InputField
                        label="Street"
                        required
                        id="street"
                        type="text"
                        message="*Street is required"
                        placeholder="Enter Street"
                        register={register}
                        errors={errors}
                    />

                    <InputField
                        label="Country"
                        required
                        id="country"
                        type="text"
                        message="*Country is required"
                        placeholder="Enter Country"
                        register={register}
                        errors={errors}
                    />


                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                <button type="button" disabled={btnLoader} onClick={() => setOpenAddressModal(false)}
                    className="min-h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60">
                    Cancel
                </button>
                <button disabled={btnLoader} type="submit"
                    className="min-h-11 flex gap-2 items-center justify-center rounded-lg bg-custom-blue px-5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60">
                    {btnLoader ? (
                        <>
                            <Spinners />Loading...
                        </>
                    ) : (
                        <>{address?.addressId ? "Save Changes" : "Save Address"}</>
                    )}

                </button>
                </div>

            </form>
        </div>
    )
}

export default AddAddressForm
