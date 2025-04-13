import React, { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, LogIn } from 'lucide-react';
import Notifications from './Notifications';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isAuthenticated, hasRole } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const linkClass = (isActive) =>
    `font-medium ${isActive ? 'text-green-700' : 'text-gray-700'} hover:text-green-700`;

  // Create NavLink with custom className function
  const createNavLink = (to, text, onClick) => {
    return React.createElement(
      NavLink,
      {
        to,
        className: ({ isActive }) => linkClass(isActive),
        onClick
      },
      text
    );
  };

  // Create desktop navigation links
  const createDesktopNav = () => {
    const homeLink = createNavLink('/', 'Home');

    if (isAuthenticated) {
      const links = [];
      links.push(homeLink);

      // Add appropriate dashboard link based on user role
      if (hasRole('donor')) {
        links.push(createNavLink('/donor', 'Donor Dashboard'));
      } else if (hasRole('receiver')) {
        links.push(createNavLink('/receiver', 'Receiver Dashboard'));
      } else if (hasRole('admin')) {
        links.push(createNavLink('/admin', 'Admin Dashboard'));
      }

      // Welcome message, notifications, and logout button
      links.push(
        React.createElement(
          'div',
          { className: 'flex items-center ml-4', key: 'welcome' },
          React.createElement(
            'span',
            { className: 'text-gray-700 text-sm mr-2' },
            `Welcome, ${user?.name || 'User'}`
          ),
          React.createElement(Notifications, { key: 'notifications' }),
          React.createElement(
            'button',
            {
              onClick: handleLogout,
              className: 'flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 transition duration-200 ml-2'
            },
            React.createElement(LogOut, { size: 14, className: 'mr-1' }),
            ' Logout'
          )
        )
      );

      return links;
    } else {
      return [
        homeLink,
        createNavLink('/donor', 'Donate Food'),
        createNavLink('/receiver', 'Receive Food'),
        // Login dropdown
        React.createElement(
          'div',
          {
            className: 'relative group'
          },
          React.createElement(
            'button',
            {
              className: 'flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 transition duration-200'
            },
            React.createElement(LogIn, { size: 14, className: 'mr-1' }),
            ' Login'
          ),
          React.createElement(
            'div',
            {
              className: 'absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-10 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100'
            },
            React.createElement(
              'div',
              { className: 'py-1' },
              React.createElement(
                'button',
                {
                  onClick: () => navigate('/donor'),
                  className: 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                },
                'Login as Donor'
              ),
              React.createElement(
                'button',
                {
                  onClick: () => navigate('/receiver'),
                  className: 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                },
                'Login as Receiver'
              ),
              React.createElement(
                'button',
                {
                  onClick: () => navigate('/admin'),
                  className: 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                },
                'Login as Admin'
              )
            )
          )
        )
      ];
    }
  };

  // Create mobile navigation links
  const createMobileNav = () => {
    const homeLink = createNavLink('/', 'Home', toggleMenu);

    if (isAuthenticated) {
      const links = [];
      links.push(homeLink);

      // Add appropriate dashboard link based on user role
      if (hasRole('donor')) {
        links.push(createNavLink('/donor', 'Donor Dashboard', toggleMenu));
      } else if (hasRole('receiver')) {
        links.push(createNavLink('/receiver', 'Receiver Dashboard', toggleMenu));
      } else if (hasRole('admin')) {
        links.push(createNavLink('/admin', 'Admin Dashboard', toggleMenu));
      }

      // Welcome message, notifications, and logout button
      links.push(
        React.createElement(
          'div',
          { className: 'pt-2 border-t border-gray-200 mt-2', key: 'welcome-mobile' },
          React.createElement(
            'div',
            { className: 'px-2 py-2 text-sm font-medium text-gray-700' },
            `Welcome, ${user?.name || 'User'}`
          ),
          React.createElement(
            'div',
            { className: 'px-2 py-2' },
            React.createElement(Notifications, { key: 'notifications-mobile' })
          ),
          React.createElement(
            'button',
            {
              onClick: handleLogout,
              className: 'w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition duration-200'
            },
            React.createElement(LogOut, { size: 14, className: 'mr-2' }),
            ' Logout'
          )
        )
      );

      return links;
    } else {
      return [
        homeLink,
        createNavLink('/donor', 'Donate Food', toggleMenu),
        createNavLink('/receiver', 'Receive Food', toggleMenu),
        // Login options
        React.createElement('div', { className: 'mt-4 space-y-2' },
          React.createElement('p', { className: 'text-sm text-gray-500 px-4' }, 'Login as:'),
          React.createElement(
            'button',
            {
              onClick: () => {
                navigate('/donor');
                toggleMenu();
              },
              className: 'flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition duration-200'
            },
            React.createElement(LogIn, { size: 14, className: 'mr-2' }),
            'Donor'
          ),
          React.createElement(
            'button',
            {
              onClick: () => {
                navigate('/receiver');
                toggleMenu();
              },
              className: 'flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition duration-200'
            },
            React.createElement(LogIn, { size: 14, className: 'mr-2' }),
            'Receiver'
          ),
          React.createElement(
            'button',
            {
              onClick: () => {
                navigate('/admin');
                toggleMenu();
              },
              className: 'flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition duration-200'
            },
            React.createElement(LogIn, { size: 14, className: 'mr-2' }),
            'Admin'
          )
        )
      ];
    }
  };

  return React.createElement(
    'header',
    { className: 'bg-white shadow-md sticky top-0 z-50' },
    React.createElement(
      'div',
      { className: 'max-w-6xl mx-auto px-4' },
      React.createElement(
        'nav',
        { className: 'flex justify-between items-center py-4' },
        // Logo
        React.createElement(
          'div',
          { className: 'flex items-center' },
          React.createElement(
            'svg',
            { width: '40', height: '40', viewBox: '0 0 50 50', fill: 'none', className: 'mr-2' },
            React.createElement('circle', { cx: '25', cy: '25', r: '20', fill: '#4CAF50' }),
            React.createElement('path', {
              d: 'M25 15V35M15 25H35',
              stroke: 'white',
              strokeWidth: '4',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            })
          ),
          React.createElement(
            NavLink,
            { to: '/', className: 'text-green-800 text-2xl font-bold' },
            'ZeroWaste'
          )
        ),

        // Desktop Navigation
        React.createElement(
          'div',
          { className: 'hidden md:flex items-center space-x-8' },
          ...createDesktopNav()
        ),

        // Mobile Menu Button
        React.createElement(
          'div',
          { className: 'md:hidden' },
          React.createElement(
            'button',
            {
              onClick: toggleMenu,
              className: 'text-gray-700 focus:outline-none',
              'aria-label': 'Toggle menu',
              'aria-expanded': isMenuOpen
            },
            React.createElement(
              'svg',
              {
                className: 'w-6 h-6',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24',
                xmlns: 'http://www.w3.org/2000/svg'
              },
              isMenuOpen
                ? React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M6 18L18 6M6 6l12 12'
                  })
                : React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M4 6h16M4 12h16M4 18h16'
                  })
            )
          )
        )
      ),

      // Mobile Menu
      isMenuOpen &&
        React.createElement(
          'div',
          { className: 'md:hidden py-4 border-t border-gray-200' },
          React.createElement(
            'div',
            { className: 'flex flex-col space-y-4' },
            ...createMobileNav()
          )
        )
    )
  );
};

export default Navbar;
