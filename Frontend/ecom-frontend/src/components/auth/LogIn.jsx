import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiArrowLeft, FiShoppingBag } from "react-icons/fi";
import { useNavigate } from "react-router-dom"
import InputField from "../shared/InputField";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { authenticateSignInUser } from "../../store/actions";
import toast from "react-hot-toast";
import  Spinners  from "../shared/Spinners";

const LogIn = () => {
    const navigate = useNavigate();
    const [loader, setLoader] = useState(false);
    const dispatch = useDispatch();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        mode: "onTouched",

    });

    const loginHandler = async (data) => {
        console.log("Login Click");
        dispatch(authenticateSignInUser(data, toast, reset, navigate, setLoader));
    }
    return (
        <main className="min-h-[calc(100dvh-70px)] bg-slate-50 px-4 py-10 sm:py-16">
          <div className="mx-auto w-full max-w-[440px]">
            <Link to="/products" className="mb-7 inline-flex min-h-11 items-center gap-2 rounded text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                <FiArrowLeft aria-hidden="true" /> Back to shopping
            </Link>
            <section className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-9 sm:py-10" aria-labelledby="sign-in-heading">
            <form
                onSubmit={handleSubmit(loginHandler)}
                aria-busy={loader}
                className="[&_input]:min-h-12 [&_input]:bg-white [&_input]:px-3 [&_input]:text-base [&_input]:transition-shadow [&_input:focus]:outline-2 [&_input:focus]:outline-offset-2 [&_input:focus]:outline-blue-600 [&_label]:mb-1"
            >
                <div className="mb-8">
                    <div className="mb-6 flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-800">
                        <FiShoppingBag aria-hidden="true" className="text-xl" /> E-Shop
                    </div>
                    <h1 id="sign-in-heading" className="text-3xl font-semibold tracking-tight text-slate-900">
                        Welcome back
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to continue shopping.</p>
                </div>
            <div className="flex flex-col gap-5">
                <InputField 
                    label="Username"
                    required
                    id="username"
                    type="text"
                    autoComplete="username"
                    message="*Username is Required"
                    placeholder="Enter your username"
                    register={register}
                    errors={errors}
                />
                <InputField 
                    label="Password"
                    required
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    message="*Password is Required"
                    placeholder="Enter your password"
                    register={register}
                    errors={errors}
                />
            </div>

            <button
                disabled={loader}
                className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 active:bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
                type="submit"
            >
                {loader ? (
                    <>
                    <Spinners/>Signing in...
                    </>
                ): (
                    <>Sign in</>
                )}

            </button>
            </form>
            <div className="mt-8 border-t border-slate-200 pt-6 text-center">
                <p className="mb-4 text-sm text-slate-500">New to E-Shop?</p>
                <Link
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                    to="/register">
                    Create an account
                </Link>  
                
            </div>
            </section>
          </div>
        </main>
    )
}

export default LogIn
