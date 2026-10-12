import { Pagination } from "@mui/material";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";


const Paginations = ({numberOfPage, totalProducts} ) => {
    const [searchParams] = useSearchParams();
    const pathname = useLocation().pathname;
    const parmas = new URLSearchParams(searchParams);
    const navigate = useNavigate();
    const paramValue = searchParams.get("page")
                       ? Number(searchParams.get("page"))
                       : 1;   
    const onChangeHandler = (event, value) => {
        parmas.set("page", value.toString());
        navigate(`${pathname}?${parmas}`);
        
    }
                    
    

    return (
        <div>
            <Pagination 
                count={numberOfPage} 
                page={paramValue}
                defaultPage={1} 
                siblingCount={0} 
                boundaryCount={2}
                shape="rounded"
                onChange={onChangeHandler}
            />
            
        </div>

    );
};

export default Paginations;