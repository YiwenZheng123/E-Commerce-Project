import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import InputField from '../../shared/InputField'
import { Button } from '@mui/material'
import Spinners from '../../shared/Spinners'
import { useDispatch } from 'react-redux'
import { fetchCategories, updateAdminProductsFromDashboard } from '../../../store/actions'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import SelectTextField from '../../shared/SelectTextField'
import Skeleton from '../../shared/Skeleton'
import ErrorPage from '../../shared/ErrorPage'
import { addNewProductFromDashboard } from '../../../store/actions/index'

const AddProductForm = ({ setOpen, product, update = false }) => {
    const [loader, setLoader] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const { categories } = useSelector((state) => state.products);
    const { categoryLoader, errorMessage } = useSelector((state) => state.errors);
    const { user } = useSelector((state) => state.auth);
    const isAdmin = user && user?.roles?.includes("ROLE_ADMIN");
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        mode: "onTouched"
    })
    const dispatch = useDispatch();
    useEffect(() => {
        if (update && product) {
            setValue('productName', product?.productName);
            setValue('price', product?.price);
            setValue('stock', product?.stock);
            setValue('discount', product?.discount);
            setValue('specialPrice', product?.specialPrice);
            setValue('description', product?.description);

        }

    }, [update, product]);

    useEffect(() => {
        if (!update) {
            dispatch(fetchCategories());
        }

    }, [dispatch, update])

    // useEffect(() => {
    //     if (categories && !categoryLoader) {
    //         setSelectedCategory(categories?.[0] ?? null);
    //     }
    // }, [categories])
    
    if(categoryLoader) return <Skeleton/>
    if(errorMessage) return <ErrorPage message={errorMessage}/>

    const saveProductHandler = (data) => {
        if (!update) {
            const sendData = {
                ...data,
                categoryId: selectedCategory?.categoryId
            }
            dispatch(addNewProductFromDashboard(sendData, toast, reset, setLoader, setOpen, isAdmin));

        } else {
            const sendData = {
                ...data,
                id: product?.id
            }
            dispatch(updateAdminProductsFromDashboard(sendData, toast, reset, setLoader, setOpen, isAdmin));

        }
    }
    return (
        <div className='py-5 relative h-full'>
            <form className='space-y-4'
                onSubmit={handleSubmit(saveProductHandler)}>
                <div className='flex md:flex-row flex-col gap-4 w-full'>
                    <InputField
                        label="Product Name"
                        required
                        id="productName"
                        text="text"
                        message="This filed is required"
                        placeholder="Product Name"
                        register={register}
                        errors={errors}
                    />
                    {!update && (
                        <SelectTextField
                            label="Select Categories"
                            select={selectedCategory}
                            setSelect={setSelectedCategory}
                            lists={categories}

                        />

                    )}
                </div>
                <div className='flex md:flex-row flex-col gap-4 w-full'>
                    <InputField
                        label="Price"
                        required
                        id="price"
                        text="number"
                        message="This filed is required"
                        placeholder="Product Price"
                        register={register}
                        errors={errors}
                    />

                    <InputField
                        label="Stock"
                        required
                        id="stock"
                        text="number"
                        message="This filed is required"
                        placeholder="Product Stock"
                        register={register}
                        errors={errors}
                    />
                </div>
                <div className="flex md:flex-row flex-col gap-4 w-full">
                    <InputField
                        label="Discount"
                        id="discount"
                        type="number"
                        message="This field is required*"
                        placeholder="Product Discount"
                        register={register}
                        errors={errors}
                    />
                    <InputField
                        label="Special Price"
                        id="specialPrice"
                        type="number"
                        message="This field is required*"
                        placeholder="Product Discount"
                        register={register}
                        errors={errors}
                    />
                </div>

                <div className='flex flex-col gap-4 w-full'>
                    <label htmlFor='desc'
                        className='font-semibold text-sm text-slate-800'
                    >
                        Description
                    </label>
                    <textarea
                        rows={5}
                        placeholder="Add product description..."
                        className={`px-4 py-2 border outline-hidden bg-transparent text-slate-800 rounded-md ${errors["description"]?.message ? "border-red-500" : "border-slate-700"
                            }`}
                        maxLength={255}
                        {...register("description", {
                            required: { value: true, message: "Description is required" },
                        })}
                    />
                    {errors["description"]?.message && (
                        <p className="text-sm font-semibold text-red-600 mt-0">
                            {errors["description"]?.message}
                        </p>
                    )}
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

export default AddProductForm
