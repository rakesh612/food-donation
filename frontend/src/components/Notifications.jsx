import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markNotificationAsRead, clearNotifications } = useSocket();
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markNotificationAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case 'new-food-post':
        navigate('/receiver?tab=list');
        break;
      case 'donation-accepted':
      case 'donation-picked':
      case 'donation-verified':
        navigate('/donor');
        break;
      case 'pickup-verified':
        navigate('/receiver?tab=requests');
        break;
      default:
        break;
    }

    setIsOpen(false);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new-food-post':
        return <span className="text-green-500">🍲</span>;
      case 'donation-accepted':
      case 'pickup-verified':
        return <span className="text-blue-500">✅</span>;
      case 'donation-picked':
        return <span className="text-orange-500">🚚</span>;
      case 'donation-verified':
        return <span className="text-purple-500">🏆</span>;
      case 'account-verified':
        return <span className="text-green-500">🔓</span>;
      case 'status-change':
        return <span className="text-blue-500">🔄</span>;
      case 'post-expired':
        return <span className="text-red-500">⏱️</span>;
      case 'user-verified':
        return <span className="text-green-500">👤</span>;
      default:
        return <span className="text-gray-500">📣</span>;
    }
  };

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
          <div className="py-2 px-3 bg-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Notifications</h3>
            <div className="flex space-x-2">
              <button
                onClick={clearNotifications}
                className="text-xs text-gray-500 hover:text-gray-700"
                aria-label="Clear all notifications"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-4 px-3 text-sm text-gray-500 text-center">
                No notifications
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="ml-2 flex-shrink-0">
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
