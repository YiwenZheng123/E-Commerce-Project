import React, { useState } from 'react'
import { MdAddShoppingCart } from 'react-icons/md';
import { useSelector } from 'react-redux';
import Loader from '../../shared/Loader';
import { FaBoxOpen } from 'react-icons/fa';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { adminCategoryTableColumn } from '../../helper/tableColumn';
import { useDashboardCategoryFilter } from '../../../hooks/useCategoryFilter';
import Modal from '../../shared/Modal';
import AddCategoryForm from '../categories/AddCategoryForm';
import DeleteModal from '../../shared/DeleteModal';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { deleteCategory } from '../../../store/actions';


const Category = () => {
  const { categories, categoryPagination: pagination } = useSelector((state) => state.products);
  const emptyCategories = !categories || categories?.length === 0;
  const [currentPage, setCurrentPage] = useState(
    pagination?.pageNumber + 1 || 1
  );
  const dispatch = useDispatch();

  useDashboardCategoryFilter();


  const [selectedCategory, setSelectedCategory] = useState('');
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [loader, setLoader] = useState(false);
  const { isLoading, errorMessage } = useSelector((state) => state.errors);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const pathname = useLocation().pathname;

  const tableRecords = categories?.map((item, index) => {
    return {
      id: item.categoryId,
      serialNumber: (pagination?.pageNumber ?? 0) * (pagination?.pageSize ?? 10) + index + 1,
      categoryName: item.categoryName,
    }
  });

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setOpenUpdateModal(true);
  };
  const handleDelete = (category) => {
    setSelectedCategory(category);
    setOpenDeleteModal(true);

  }


  const handlePaginationChange = (paginationModel) => {
    const page = paginationModel.page + 1;
    setCurrentPage(page);
    params.set('page', page.toString());
    navigate(`${pathname}?${params}`)

  };

  const onDeleteHandler = () => {
    dispatch(deleteCategory(setLoader, selectedCategory?.id, toast, setOpenDeleteModal, handlePaginationChange));
  }
  return (
    <div>
      <div className='pt-6 pb-10 flex justify-end'>
        <button
          className='bg-custom-blue hover:bg-blue-800 text-white font-semibold py-2 px-4 flex items-center gap-2 rounded-md shadow-md transition-colors hover:text-slate-300 duration-300'
          onClick={() => setOpenAddModal(true)}
        >
          <MdAddShoppingCart className='text-xl' />
          Add New Categories
        </button>

      </div>
      {!emptyCategories && (
        <h1 className='text-slate-800 text-3xl text-center font-bold pb-6 uppercase'>
          All Categories
        </h1>
      )}
      {isLoading ? (
        <Loader />
      ) : (
        <>
          {emptyCategories ? (
            <div className='flex flex-col items-center justify-center text-gray-600 py-10'>
              <FaBoxOpen size={50} className='mb-3' />
              <h2 className='text-2xl font-semibold'>
                No Categories Created Yet
              </h2>
            </div>
          ) : (
            <div className='max-w-full'>
              <DataGrid
                className='w-full'
                rows={tableRecords}
                columns={adminCategoryTableColumn(
                  handleEdit,
                  handleDelete,
                )}
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
        open={openUpdateModal || openAddModal}
        setOpen={openUpdateModal ? setOpenUpdateModal : setOpenAddModal}
        title={openUpdateModal ? 'Update Category' : 'Add Category'}
      >
        <AddCategoryForm
          setOpen={openUpdateModal ? setOpenUpdateModal : setOpenAddModal}
          category={selectedCategory}
          update={openUpdateModal}
        />

      </Modal>

      <DeleteModal
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        loader={loader}
        title={'Delete Category'}
        onDeleteHandler={onDeleteHandler}
      />




    </div>
  )
};

export default Category
