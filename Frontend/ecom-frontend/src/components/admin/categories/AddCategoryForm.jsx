import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import InputField from '../../shared/InputField'
import { Button } from '@mui/material'
import Spinners from '../../shared/Spinners'
import { useDispatch } from 'react-redux'
import { updateAdminCategoriesFromDashboard } from '../../../store/actions/index'
import toast from 'react-hot-toast'
import { createCategoriesFromDashboard } from '../../../store/actions/index'


const AddCategoryForm = ({ setOpen, category, update = false }) => {
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
    useEffect(() => {
        setSubmitError("");
        reset({
            categoryName: update ? category?.categoryName ?? "" : "",
        });
    }, [update, category, reset]);


    const saveCategoryHandler = async (data) => {
        setSubmitError("");
        setLoader(true);
        try {
            if (!update) {
                await dispatch(createCategoriesFromDashboard(data, toast, reset, setOpen, setSubmitError));
            } else {
                const sendData = { ...data, categoryId: category.id };
                await dispatch(updateAdminCategoriesFromDashboard(sendData, toast, reset, setOpen, setSubmitError));
            }
        } finally {
            setLoader(false);
        }
    }
    return (
        <div className='py-5 relative h-full'>
            <form className='space-y-4'
                onSubmit={handleSubmit(saveCategoryHandler)}>
                {submitError && <p role="alert" className="text-sm text-red-600">{submitError}</p>}
                <div className='flex md:flex-row flex-col gap-4 w-full'>
                    <InputField
                        label="Category Name"
                        required
                        id="categoryName"
                        type="text"
                        message="This filed is required"
                        placeholder="Category Name"
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
                            update ? "Update" : "Add"
                        )}
                    </Button>

                </div>




            </form>

        </div>
    )
}

export default AddCategoryForm
