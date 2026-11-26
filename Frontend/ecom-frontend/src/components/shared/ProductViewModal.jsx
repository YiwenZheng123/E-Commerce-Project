import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { MdClose, MdDone, MdImageNotSupported } from 'react-icons/md';
import { formatPrice } from '../../utils/formatPrice';

function ProductViewModal({ open, setOpen, product, isAvailable }) {
  const { productName, image, description, price, specialPrice } = product;
  const hasDiscount = specialPrice != null && Number(specialPrice) < Number(price);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="relative z-[60]">
      <DialogBackdrop transition className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 data-closed:opacity-0 motion-reduce:transition-none" />
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <DialogPanel
          transition
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition duration-200 data-closed:translate-y-2 data-closed:opacity-0 motion-reduce:transition-none sm:max-h-[calc(100dvh-3rem)]"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Product details</p>
            <button
              type="button"
              aria-label="Close product details"
              data-autofocus
              onClick={() => setOpen(false)}
              className="flex size-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <MdClose aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <div className="grid md:grid-cols-2">
              <div className="flex min-w-0 items-center justify-center bg-slate-50 p-6 sm:p-10">
                {image ? (
                  <img src={image} alt={productName} className="h-56 w-full object-contain sm:h-72 md:h-96" />
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center gap-3 text-slate-400 md:h-96">
                    <MdImageNotSupported aria-hidden="true" className="size-10" />
                    <span className="text-sm">No image available</span>
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col p-6 sm:p-8 md:p-10">
                <span className={`mb-5 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isAvailable ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
                  {isAvailable ? <MdDone aria-hidden="true" className="size-4" /> : <MdClose aria-hidden="true" className="size-4" />}
                  {isAvailable ? 'In stock' : 'Out of stock'}
                </span>
                <DialogTitle as="h2" className="break-words text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                  {productName}
                </DialogTitle>
                <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-3xl font-semibold tracking-tight text-slate-900">
                    <span className="sr-only">Current price: </span>
                    {formatPrice(hasDiscount ? specialPrice : price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-base text-slate-500 line-through">
                      <span className="sr-only">Original price: </span>
                      {formatPrice(price)}
                    </span>
                  )}
                </div>
                {hasDiscount && <p className="mt-2 text-sm font-medium text-emerald-700">You save {formatPrice(price - specialPrice)}</p>}
                <div className="my-7 border-t border-slate-200 pt-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">About this product</h3>
                  <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                    {description || 'No description available.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-auto min-h-12 w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Close preview
                </button>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default ProductViewModal;
