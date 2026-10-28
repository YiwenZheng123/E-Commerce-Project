import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import React from 'react'
import { FaTimes } from 'react-icons/fa';

const AddressInfoModal = ({ open, setOpen, children }) => {
  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        {/* The backdrop, rendered as a fixed sibling to the panel container */}
        <DialogBackdrop className="fixed inset-0 bg-slate-900/50 transition-opacity" />

        {/* Full-screen container to center the panel */}
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          {/* The actual dialog panel  */}
          <DialogPanel className="relative w-full max-w-2xl max-h-[90dvh] mx-auto overflow-y-auto bg-white rounded-2xl shadow-xl">
            <DialogTitle className='sr-only'>Shipping Address</DialogTitle>
            <div className='p-6 sm:p-8'>
                {children}
            </div>
            <div className='absolute right-4 top-4 sm:right-6 sm:top-6'>
                <button onClick={() => setOpen(false)} type='button' aria-label='Close address form'
                    className='flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'>
                    <FaTimes size={18} />
                </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
  );
}

export default AddressInfoModal
