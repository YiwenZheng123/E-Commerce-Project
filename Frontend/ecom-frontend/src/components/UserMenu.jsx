import React from "react";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import { BiUser } from "react-icons/bi";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FaShoppingCart, FaUserShield } from "react-icons/fa";
import { IoExitOutline } from "react-icons/io5";
import { useDispatch } from "react-redux";
import { logOutUser } from "../store/actions/index";
import { useNavigate } from "react-router-dom";
const UserMenu = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAdmin = user && user?.roles.includes("ROLE_ADMIN");
  const isSeller = user && user?.roles.includes("ROLE_SELLER");
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
      <button
        type="button"
        id="user-menu-button"
        aria-label="Open account menu"
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-500 cursor-pointer hover:border-blue-400 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400 transition-colors"
        onClick={handleClick}
      >
        <Avatar src={user?.avatarUrl} alt={user?.username} sx={{ width: 34, height: 34, bgcolor: 'var(--color-custom-blue)' }}>
          <BiUser aria-hidden="true" className="text-xl text-white" />
        </Avatar>
      </button>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              width: 240,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 2,
              border: '1px solid var(--color-slate-200)',
              boxShadow: '0 12px 32px rgb(15 23 42 / 16%)',
              color: 'var(--color-slate-700)',
            },
          },
          list: {
            'aria-labelledby': 'user-menu-button',
            sx: {
              p: 1,
              '& .MuiMenuItem-root': {
                minHeight: 44,
                gap: 1.5,
                px: 1.5,
                borderRadius: 1,
                fontSize: 14,
                '&:hover, &.Mui-focusVisible': {
                  bgcolor: 'var(--color-blue-50)',
                  color: 'var(--color-custom-blue)',
                },
              },
            },
          },
        }}
      >
        <MenuItem component={Link} to="/profile" onClick={handleClose}>
          <BiUser aria-hidden="true" className="shrink-0 text-xl" />
          <span className="truncate font-semibold" title={user?.username}>
            {user?.username}
          </span>

        </MenuItem>
        <MenuItem component={Link} to="/profile/orders" onClick={handleClose}>
          <FaShoppingCart aria-hidden="true" className="shrink-0 text-lg" />
          <span className="font-medium">
            My Orders
          </span>
        </MenuItem>
        {(isAdmin || isSeller)&& (
          <MenuItem component={Link} to={isAdmin ? "/admin" : "/admin/orders"} onClick={handleClose}>
            <FaUserShield aria-hidden="true" className="shrink-0 text-xl" />
            <span className="font-medium">
              {isAdmin ? "Admin Panel" : "Seller Panel"}
            </span>
          </MenuItem>
        )}


        <MenuItem sx={{ mt: 1, borderTop: '1px solid var(--color-slate-200)', color: 'var(--color-red-600)' }} onClick={logOutHandler}>
          <IoExitOutline aria-hidden="true" className="shrink-0 text-xl" />
          <span className="font-medium">
            Log Out
          </span>
        </MenuItem>
      </Menu>
    </div>
  );
}

export default UserMenu;
