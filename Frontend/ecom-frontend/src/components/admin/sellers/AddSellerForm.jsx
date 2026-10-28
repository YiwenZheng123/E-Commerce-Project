import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import InputField from '../../shared/InputField'
import { Button } from '@mui/material'
import Spinners from '../../shared/Spinners'
import { useDispatch } from 'react-redux'
import { addNewDashboardSeller } from '../../../store/actions/index'
import toast from 'react-hot-toast'



const AddSellerForm = ({ setOpen }) => {
    const [loader, setLoader] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        mode: "onTouched"
    })
    const dispatch = useDispatch();

    const saveSellerHandler = async (data) => {
        setSubmitError("");
        setLoader(true);
        try {
            const sendData = {
                ...data,
                roles: ["seller"],
            };
            await dispatch(addNewDashboardSeller(sendData, toast, reset, setOpen, setLoader));
        } finally {
            setLoader(false);
        }
    }
    return (
        <div className='py-5 relative h-full'>
            <form className='space-y-4'
                onSubmit={handleSubmit(saveSellerHandler)}>
                {submitError && <p role="alert" className="text-sm text-red-600">{submitError}</p>}
                <div className='flex md:flex-row flex-col gap-4 w-full'>
                    <InputField
                        label="User Name"
                        required
                        id="username"
                        type="text"
                        message="This filed is required"
                        placeholder="Enter your  username"
                        register={register}
                        errors={errors}
                    />
                </div>
                <div className='flex md:flex-row flex-col gap-4 w-full'>
                    <InputField
                        label="Email"
                        required
                        id="email"
                        type="text"
                        message="This filed is required"
                        placeholder="Enter your email"
                        register={register}
                        errors={errors}
                    />
                </div>
                <div className='flex md:flex-row flex-col gap-4 w-full'>
                    <InputField
                        label="Password"
                        required
                        id="password"
                        type="password"
                        message="This filed is required"
                        placeholder="Enter your password"
                        register={register}
                        errors={errors}
                    />
                </div>

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
                        disabled={loader}
                        type='submit'
                        variant='contained'
                        color='primary'
                        className='bg-custom-blue text-white py-2.5 px-4 text-sm font-medium'>
                        {loader ? (
                            <div className='flex gap-2 items-center'>
                                <Spinners /> Loading...
                            </div>
                        ) : (
                            "Add"
                        )}
                    </Button>

                </div>




            </form>

        </div>
    )
}

export default AddSellerForm
