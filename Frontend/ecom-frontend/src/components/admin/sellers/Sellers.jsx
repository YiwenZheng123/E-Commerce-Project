import React, { useState } from 'react'
import { MdAddShoppingCart } from 'react-icons/md';
import { useSelector } from 'react-redux';
import Loader from '../../shared/Loader';
import { FaBoxOpen } from 'react-icons/fa';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { adminSellerTableColumn } from '../../helper/tableColumn';
import  useSellerFilter  from '../../../hooks/useSellerFilter';
import Modal from '../../shared/Modal';
import AddSellerForm from '../sellers/AddSellerForm';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';



const Sellers = () => {
  const { sellers, sellersPagination: pagination } = useSelector((state) => state.seller);
  const emptySellers = !sellers || sellers?.length === 0;
  const [currentPage, setCurrentPage] = useState(
    pagination?.pageNumber + 1 || 1
  );
  const dispatch = useDispatch();
  useSellerFilter();


  const [openAddModal, setOpenAddModal] = useState(false);
  const [loader, setLoader] = useState(false);
  const { isLoading, errorMessage } = useSelector((state) => state.errors);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const pathname = useLocation().pathname;

  const tableRecords = sellers?.map((item, index) => {
    return {
      id: item.userId,
      serialNumber: (pagination?.pageNumber ?? 0) * (pagination?.pageSize ?? 10) + index + 1,
      userName: item.username,
      email: item.email,
    }
  });



  const handlePaginationChange = (paginationModel) => {
    const page = paginationModel.page + 1;
    setCurrentPage(page);
    params.set('page', page.toString());
    navigate(`${pathname}?${params}`)

  };

  return (
    <div>
      <div className='pt-6 pb-10 flex justify-end'>
        <button
          className='bg-custom-blue hover:bg-blue-800 text-white font-semibold py-2 px-4 flex items-center gap-2 rounded-md shadow-md transition-colors hover:text-slate-300 duration-300'
          onClick={() => setOpenAddModal(true)}
        >
          <MdAddShoppingCart className='text-xl' />
          Add New Sellers
        </button>

      </div>
      {!emptySellers && (
        <h1 className='text-slate-800 text-3xl text-center font-bold pb-6 uppercase'>
          All Sellers
        </h1>
      )}
      {isLoading ? (
        <Loader />
      ) : (
        <>
          {emptySellers ? (
            <div className='flex flex-col items-center justify-center text-gray-600 py-10'>
              <FaBoxOpen size={50} className='mb-3' />
              <h2 className='text-2xl font-semibold'>
                No Sellers Created Yet
              </h2>
            </div>
          ) : (
            <div className='max-w-full'>
              <DataGrid
                className='w-full'
                rows={tableRecords}
                columns={adminSellerTableColumn()}
                paginationMode='server'
                rowCount={pagination?.totalElements || 0}
                paginationModel={{
                  pageSize: pagination?.pageSize || 10,
                  page: currentPage - 1,
                }}
                onPaginationModelChange={handlePaginationChange}
                disableRowSelectionOnClick
                disableColumnResize
                pageSizeOptions={[pagination?.pageSize || 10]}
                pagination
                paginationOptions={{
                  showFirstButton: true,
                  showLastButton: true,
                  hideNextButton: currentPage === pagination?.totalPages,
                }}
              />

            </div>

          )}
        </>

      )}

      <Modal
        open={ openAddModal}
        setOpen={setOpenAddModal}
        title='Add Seller'
      >
        <AddSellerForm
          setOpen={setOpenAddModal}
        />

      </Modal>





    </div>
  )
}

export default Sellers