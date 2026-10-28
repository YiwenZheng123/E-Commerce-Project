import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom"
import InputField from "../shared/InputField";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiArrowLeft, FiShoppingBag } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { registerNewUser } from "../../store/actions";
import  Spinners  from "../shared/Spinners";

const Register = () => {
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

    const RegisterHandler = async (data) => {
        console.log("Register Click");
        dispatch(registerNewUser(data,toast, reset, navigate, setLoader));
        
    }
    return (
        <main className="min-h-[calc(100dvh-70px)] bg-slate-50 px-4 py-10 sm:py-16">
          <div className="mx-auto w-full max-w-[440px]">
            <Link to="/products" className="mb-7 inline-flex min-h-11 items-center gap-2 rounded text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                <FiArrowLeft aria-hidden="true" /> Back to shopping
            </Link>
            <section className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-9 sm:py-10" aria-labelledby="register-heading">
            <form
                onSubmit={handleSubmit(RegisterHandler)}
                aria-busy={loader}
                className="[&_input]:min-h-12 [&_input]:bg-white [&_input]:px-3 [&_input]:text-base [&_input]:transition-shadow [&_input:focus]:outline-2 [&_input:focus]:outline-offset-2 [&_input:focus]:outline-blue-600 [&_label]:mb-1"
            >
                <div className="mb-8">
                    <div className="mb-6 flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-800">
                        <FiShoppingBag aria-hidden="true" className="text-xl" /> E-Shop
                    </div>
                    <h1 id="register-heading" className="text-3xl font-semibold tracking-tight text-slate-900">
                        Create an account
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Your next great find starts here.</p>
                </div>
            <div className="flex flex-col gap-5">
                <InputField 
                    label="Username"
                    required
                    id="username"
                    autoComplete="username"
                    type="text"
                    message="*Username is Required"
                    placeholder="Choose a username"
                    register={register}
                    errors={errors}
                />
                <InputField 
                    label="Email"
                    required
                    id="email"
                    autoComplete="email"
                    min={6}
                    type="email"
                    message="*Email is Required"
                    placeholder="Enter your email address"
                    register={register}
                    errors={errors}
                />
                <InputField 
                    label="Password"
                    required
                    id="password"
                    autoComplete="new-password"
                    type="password"
                    message="*Password is Required"
                    placeholder="Create a password"
                    register={register}
                    errors={errors}
                />
            </div>

            <button
                disabled={loader}
                className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 active:bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
                type="submit">
                {loader ? (
                    <>
                     <Spinners/>Creating account...
                    </>
                ) : (
                    <>Create account</>
                )}
            </button>

            </form>
            <div className="mt-8 border-t border-slate-200 pt-6 text-center">
              <p className="mb-4 text-sm text-slate-500">Already have an account?</p>
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                to="/login">
                Sign in
              </Link>
            </div>
            </section>
          </div>
        </main>
    )
}

export default Register
