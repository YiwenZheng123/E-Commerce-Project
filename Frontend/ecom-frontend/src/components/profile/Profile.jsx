import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Avatar, Button } from '@mui/material'
import { FiCamera, FiChevronDown, FiLock, FiMapPin, FiUser } from 'react-icons/fi'
import toast from 'react-hot-toast'
import InputField from '../shared/InputField'
import Loader from '../shared/Loader'
import Spinners from '../shared/Spinners'
import { getUserProfile, updateUserProfile, updateUserPassword, updateUserAvatar } from '../../store/actions'
import ProfileAddresses from './ProfileAddresses'

const Profile = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [loader, setLoader] = useState(true);
    const [profileLoader, setProfileLoader] = useState(false);
    const [passwordLoader, setPasswordLoader] = useState(false);
    const [avatarLoader, setAvatarLoader] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: 'onTouched' });
    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        reset: resetPassword,
        formState: { errors: passwordErrors },
    } = useForm({ mode: 'onTouched' });

    useEffect(() => {
        dispatch(getUserProfile(navigate, setLoader, setErrorMessage));
    }, [dispatch, navigate]);

    useEffect(() => {
        reset({ username: user?.username });
    }, [user?.username, reset]);

    const saveProfileHandler = (data) => {
        dispatch(updateUserProfile(data, toast, setProfileLoader));
    }

    const savePasswordHandler = (data) => {
        dispatch(updateUserPassword(data, toast, resetPassword, navigate, setPasswordLoader));
    }

    const uploadAvatarHandler = (event) => {
        const image = event.target.files[0];
        event.target.value = '';
        if (image) {
            if (image.size > 1024 * 1024) {
                toast.error('Please choose an image up to 1 MB');
                return;
            }
            dispatch(updateUserAvatar(image, toast, setAvatarLoader));
        }
    }

    if (loader) return <Loader />;
    if (errorMessage) return <p role='alert' className='text-center text-red-600 py-10'>{errorMessage}</p>;

    return (
        <main className='min-h-[calc(100dvh-70px)] bg-slate-50 px-4 py-10 sm:py-14'>
          <div className='max-w-3xl mx-auto'>
            <div className='mb-7'>
                <p className='text-sm font-semibold text-custom-blue mb-2'>MY ACCOUNT</p>
                <h1 className='text-slate-900 text-3xl font-bold'>My Profile</h1>
                <p className='mt-2 text-slate-500'>Manage your personal information, password and addresses.</p>
            </div>
            <div className='flex flex-wrap items-center gap-5 rounded-xl border border-blue-100 bg-white p-6 shadow-sm mb-6'>
                <Avatar src={user?.avatarUrl} alt={user?.username} sx={{ width: 72, height: 72, bgcolor: 'var(--color-custom-blue)', fontSize: 28 }}>
                    {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <div className='min-w-0 flex-1'>
                    <p className='font-semibold text-lg text-slate-900 break-words'>{user?.username}</p>
                    <p className='text-sm text-slate-500 break-all'>{user?.email}</p>
                    <p className='text-xs text-slate-500 mt-1'>JPEG or PNG, up to 1 MB</p>
                </div>
                <label className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-custom-blue hover:bg-blue-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 ${avatarLoader ? 'opacity-60' : 'cursor-pointer'}`}>
                    <FiCamera aria-hidden='true' /> {avatarLoader ? 'Uploading...' : 'Change photo'}
                    <input className='sr-only' type='file' accept='image/jpeg,image/png' disabled={avatarLoader}
                        aria-label='Change profile photo' onChange={uploadAvatarHandler} />
                </label>
            </div>
            <div className='space-y-4'>
                <details className='group border border-slate-200 rounded-xl bg-white shadow-sm'>
                    <summary className='flex min-h-20 items-center gap-4 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'>
                        <span className='rounded-lg bg-blue-50 p-3 text-custom-blue'><FiUser aria-hidden='true' /></span>
                        <span className='flex-1'><span className='block text-base font-semibold text-slate-900'>Personal Information</span><span className='block mt-1 text-sm text-slate-500'>Update your username and view your email.</span></span>
                        <FiChevronDown aria-hidden='true' className='text-slate-500 transition-transform group-open:rotate-180' />
                    </summary>
                    <form onSubmit={handleSubmit(saveProfileHandler)} className='space-y-5 border-t border-slate-100 p-5 sm:p-6' aria-busy={profileLoader}>
                        <InputField label='Username' id='username' type='text' autoComplete='username'
                            required min={3} message='Username is required' register={register} errors={errors} />
                        <p className='text-sm text-slate-500'>Username must be 3–20 characters.</p>
                        <div className='flex flex-col gap-1'>
                            <label htmlFor='email' className='font-semibold text-sm text-slate-800'>Email</label>
                            <input id='email' type='email' value={user?.email || ''} readOnly
                                className='px-2 py-2 border border-slate-300 rounded-md bg-slate-100 text-slate-600' />
                            <p className='text-sm text-slate-500'>Email cannot be changed.</p>
                        </div>
                        <Button type='submit' variant='contained' disabled={profileLoader || passwordLoader}>
                            {profileLoader ? <Spinners /> : 'Save Changes'}
                        </Button>
                    </form>
                </details>

                <details className='group border border-slate-200 rounded-xl bg-white shadow-sm'>
                    <summary className='flex min-h-20 items-center gap-4 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'>
                        <span className='rounded-lg bg-blue-50 p-3 text-custom-blue'><FiLock aria-hidden='true' /></span>
                        <span className='flex-1'><span className='block text-base font-semibold text-slate-900'>Change Password</span><span className='block mt-1 text-sm text-slate-500'>Keep your account secure.</span></span>
                        <FiChevronDown aria-hidden='true' className='text-slate-500 transition-transform group-open:rotate-180' />
                    </summary>
                    <form onSubmit={handlePasswordSubmit(savePasswordHandler)} className='space-y-5 border-t border-slate-100 p-5 sm:p-6' aria-busy={passwordLoader}>
                        <InputField label='Current Password' id='currentPassword' type='password' autoComplete='current-password'
                            required message='Current password is required' register={registerPassword} errors={passwordErrors} />
                        <InputField label='New Password' id='newPassword' type='password' autoComplete='new-password'
                            required min={6} message='New password is required' register={registerPassword} errors={passwordErrors} />
                        <InputField label='Confirm New Password' id='confirmPassword' type='password' autoComplete='new-password'
                            required message='Please confirm your new password' register={registerPassword} errors={passwordErrors} />
                        <p className='text-sm text-slate-500'>Use 6–40 characters. You will need to sign in again after changing your password.</p>
                        <Button type='submit' variant='contained' disabled={profileLoader || passwordLoader}>
                            {passwordLoader ? <Spinners /> : 'Update Password'}
                        </Button>
                    </form>
                </details>
                <details className='group border border-slate-200 rounded-xl bg-white shadow-sm'>
                    <summary className='flex min-h-20 items-center gap-4 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'>
                        <span className='rounded-lg bg-blue-50 p-3 text-custom-blue'><FiMapPin aria-hidden='true' /></span>
                        <span className='flex-1'><span className='block text-base font-semibold text-slate-900'>Shipping Addresses</span><span className='block mt-1 text-sm text-slate-500'>Manage where your orders are delivered.</span></span>
                        <FiChevronDown aria-hidden='true' className='text-slate-500 transition-transform group-open:rotate-180' />
                    </summary>
                    <div className='border-t border-slate-100 p-5 sm:p-6'><ProfileAddresses /></div>
                </details>
            </div>
          </div>
        </main>
    )
}

export default Profile
