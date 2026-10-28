const initialState = {
    sellers: null,
    sellersPagination: {},
};

export const sellerReducer = (state = initialState, action) => {
    switch (action.type) {
        case "GET_SELLERS":
            return {
                ...state,
                sellers: action.payload,
                sellersPagination: {
                    ...state.sellersPagination,
                    pageNumber: action.pageNumber,
                    pageSize: action.pageSize,
                    totalElements: action.totalElements,
                    totalPages: action.totalPages,
                    lastPage: action.lastPage,
                },
            };
        default:
            return state;
    }
}