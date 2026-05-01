import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { NAV_ITEMS, ROUTES } from '../../utils/constants.js';
import { Button } from '../common/Button.jsx';
import { classNames } from '../../utils/helpers.js';
import { Menu, X } from 'lucide-react';

export const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-rent-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link 
          to={ROUTES.TRENDING}
          className="text-rent-700 font-extrabold text-lg tracking-tight hover:text-rent-500 transition-colors"
        >
          RentPi
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map(({ path, label }) => (
            <NavLink key={path} to={path}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 rounded-md hover:bg-rent-50 text-rent-700"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Auth Buttons */}
        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(ROUTES.LOGIN)}
              >
                Login
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => navigate(ROUTES.REGISTER)}
              >
                Register
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-rent-100 bg-white px-4 py-2">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ path, label }) => (
              <NavLink 
                key={path} 
                to={path}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-left py-2"
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

const NavLink = ({ to, children, className = '', onClick }) => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const isActive = currentPath === to;

  return (
    <button
      onClick={() => {
        navigate(to);
        onClick?.();
      }}
      className={classNames(
        'px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
        isActive 
          ? 'bg-rent-50 text-rent-950' 
          : 'text-rent-700 hover:bg-rent-50 hover:text-rent-950',
        className
      )}
    >
      {children}
    </button>
  );
};

export default Header;
