import React from "react";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import { BiUser } from "react-icons/bi";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FaShoppingCart } from "react-icons/fa";
import { IoExitOutline } from "react-icons/io5";
import BackDrop from "./BackDrop";
import { useDispatch } from "react-redux";
import { logOutUser } from "../store/actions/index";
import { useNavigate } from "react-router-dom";
const UserMenu = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const {user} = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const logOutHandler = () => {
    dispatch(logOutUser(navigate));
  };


    return (
    <div className='relative z-30'>
      <div
        className="sm:border sm:border-slate-400 flex flex-row items-center gap-1 rounded-full cursor-pointer hover:shadow-md transition text-slate-700"
        onClick={handleClick}
      >
        <Avatar alt='Menu' src=''/>
      </div>
      <Menu
        sx={{width:"400px"}}
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            'aria-labelledby':'basic-button',
            sx: {width: 160},
          },
        }}
      >
        <Link to="/profile">
          <MenuItem className="flex gap-2" onClick={handleClose}>
            <BiUser className="text-xl"/>
              <span className="font-bold">
                {user?.username}
              </span>

          </MenuItem>
        </Link>
        <Link to="/profile/order">
           <MenuItem className="flex gap-2" onClick={handleClose}>
              <FaShoppingCart className="text-xl"/>
              <span className="font-bold">
                order
              </span>
           </MenuItem>
        </Link>


          <MenuItem className="flex gap-2" onClick={logOutHandler}>
              <div className="font-semibold w-full flex gap-2 items-center bg-button-gradient px-4 py-1 text-white rounded-xs">
                <IoExitOutline className="text-xl"/>
                <span className="font-bold">
                  LogOut
                </span>
              </div>
           </MenuItem>
      </Menu>
      {open && <BackDrop/>}
    </div>
  );
}

export default UserMenu;