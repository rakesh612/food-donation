import React, { useState, useEffect, useContext } from "react";
import {
  Users,
  BarChart,
  AlertTriangle,
  PlusCircle,
  CheckCircle,
  RefreshCw,
  LogIn,
  User,
  Send
} from "lucide-react";
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user, login, loading } = useContext(AuthContext);
  const { connected, notifications, verifyUser } = useSocket();

  // Authentication States
  const [authMode, setAuthMode] = useState('login');
  const [localAuthError, setLocalAuthError] = useState('');
  const [userData, setUserData] = useState({
    email: '',
    password: ''
  });

  // Dashboard stats
  const [stats, setStats] = useState({
    foodSaved: 0,
    peopleServed: 0,
    emissionsPrevented: 0,
    activePosts: 0
  });

  // Users list
  const [users, setUsers] = useState([]);

  // Flagged posts
  const [flaggedPosts, setFlaggedPosts] = useState([]);

  // Loading states
  const [isLoading, setIsLoading] = useState({
    dashboard: false,
    users: false,
    fraud: false
  });

  // NGO onboarding states
  const [ngoData, setNgoData] = useState({
    name: '',
    email: '',
    role: 'receiver'
  });
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [onboardSuccess, setOnboardSuccess] = useState('');

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    setIsLoading(prev => ({ ...prev, dashboard: true }));
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:5002/api/reports/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoading(prev => ({ ...prev, dashboard: false }));
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(prev => ({ ...prev, users: true }));
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:5002/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(prev => ({ ...prev, users: false }));
    }
  };

  // Fetch flagged posts
  const fetchFlaggedPosts = async () => {
    setIsLoading(prev => ({ ...prev, fraud: true }));
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:5002/api/food-posts/flagged', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFlaggedPosts(response.data);
    } catch (error) {
      console.error('Error fetching flagged posts:', error);
      toast.error('Failed to load flagged posts');
    } finally {
      setIsLoading(prev => ({ ...prev, fraud: false }));
    }
  };

  // Authentication functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
    setLocalAuthError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting admin login with:', userData.email);
      const response = await login(userData.email, userData.password);

      // Check if the user has the admin role
      if (response && response.user && response.user.role !== 'admin') {
        // Single clear message for wrong role
        toast.error('Login failed. This panel is only for administrators. Please use the appropriate panel for your account type.');

        // Clear local error to avoid duplicate messages
        setLocalAuthError('');

        // Force logout if the user is not an admin
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.reload();
        return;
      }

      toast.success(`Welcome, Administrator ${response.user.name || ''}!`);

      setUserData({ email: '', password: '' });
    } catch (error) {
      console.error('Admin login error:', error);
      let errorMessage;
      if (error.message === 'Invalid credentials') {
        errorMessage = 'Invalid credentials. Please use an admin account.';
      } else {
        errorMessage = error.message || 'Login failed';
      }
      setLocalAuthError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Reset states when user changes
  useEffect(() => {
    if (!user) {
      setActiveTab("dashboard");
    }
  }, [user]);

  // NGO onboarding functions
  const handleNGOInputChange = (e) => {
    const { name, value } = e.target;
    setNgoData(prev => ({ ...prev, [name]: value }));
    setOnboardError('');
    setOnboardSuccess('');
  };

  const handleOnboardNGO = async (e) => {
    e.preventDefault();
    setIsOnboarding(true);
    setOnboardError('');
    setOnboardSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        'http://localhost:5002/api/users/onboard',
        {
          name: ngoData.name,
          email: ngoData.email,
          role: ngoData.role,
          isVerified: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setOnboardSuccess(`User ${ngoData.name} successfully onboarded! Temporary password: ${response.data.generatedPassword}`);
      setNgoData({
        name: '',
        email: '',
        role: 'receiver'
      });

      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error('Error onboarding user:', error);
      setOnboardError(error.response?.data?.message || 'Failed to onboard user');
    } finally {
      setIsOnboarding(false);
    }
  };

  // Handle user verification
  const handleVerifyUser = async (userId) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.put(`http://localhost:5002/api/users/verify/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update user via socket
      verifyUser(userId);

      // Update local state
      setUsers(users.map(user =>
        user._id === userId ? { ...user, isVerified: true } : user
      ));

      toast.success('User verified successfully');
    } catch (error) {
      console.error('Error verifying user:', error);
      toast.error('Failed to verify user');
    }
  };

  // This function is now handled by the improved handleOnboardNGO above

  // Load data when tab changes
  useEffect(() => {
    if (user && user.role === 'admin') {
      if (activeTab === 'dashboard') {
        fetchDashboardStats();
      } else if (activeTab === 'users') {
        fetchUsers();
      } else if (activeTab === 'fraud') {
        fetchFlaggedPosts();
      }
    }
  }, [activeTab, user]);

  // Set up periodic refresh for real-time data
  useEffect(() => {
    if (user && user.role === 'admin' && connected) {
      // Set up interval to refresh data every 30 seconds
      const intervalId = setInterval(() => {
        console.log('Auto-refreshing admin dashboard data...');
        if (activeTab === 'dashboard') {
          fetchDashboardStats();
        } else if (activeTab === 'users') {
          fetchUsers();
        } else if (activeTab === 'fraud') {
          fetchFlaggedPosts();
        }
      }, 30000); // Every 30 seconds

      // Clean up interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [user, connected, activeTab]);

  // Real-time activity feed
  const [activityFeed, setActivityFeed] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  // Handle real-time notifications
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latestNotification = notifications[0];

      if (!latestNotification.read) {
        // Add to activity feed
        const activityItem = {
          id: Date.now(),
          time: new Date(),
          type: latestNotification.type,
          message: latestNotification.message,
          data: latestNotification.data
        };

        setActivityFeed(prev => [activityItem, ...prev.slice(0, 19)]); // Keep last 20 activities
        setLastUpdateTime(new Date());

        // Show toast notification based on type
        switch (latestNotification.type) {
          case 'new-food-post-created':
            toast.info(`New food donation posted by ${latestNotification.data?.donorName || 'a donor'}`);
            // Always update dashboard stats for any notification
            fetchDashboardStats();
            break;
          case 'food-post-status-changed':
            toast.info(`Food post status changed to ${latestNotification.data?.status}`);
            fetchDashboardStats();
            break;
          case 'food-post-expired':
            toast.warning('Food post has expired');
            fetchDashboardStats();
            if (activeTab === 'fraud') fetchFlaggedPosts();
            break;
          case 'user-verified':
            toast.success(`User ${latestNotification.data?.name || 'Unknown'} has been verified`);
            fetchDashboardStats();
            if (activeTab === 'users') fetchUsers();
            break;
          default:
            // For any other notification, refresh dashboard stats
            fetchDashboardStats();
            break;
        }
      }
    }
  }, [notifications, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Stats Cards */}
            <div className="col-span-2 flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-gray-800">Dashboard Statistics</h2>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-2">
                  Last updated: {lastUpdateTime.toLocaleTimeString()}
                </span>
                <button
                  onClick={fetchDashboardStats}
                  className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded flex items-center"
                  disabled={isLoading.dashboard}
                >
                  <RefreshCw size={14} className={`mr-1 ${isLoading.dashboard ? 'animate-spin' : ''}`} />
                  Refresh All
                </button>
              </div>
            </div>

            <div className="bg-green-100 p-6 rounded-2xl shadow relative overflow-hidden">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-green-800">Food Saved</h3>
                {connected && <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
              </div>
              <p className="text-3xl font-bold mt-2">{stats.foodSaved || 0} kg</p>
              <div className="absolute bottom-0 right-0 w-16 h-16 opacity-10">
                <BarChart className="w-full h-full text-green-800" />
              </div>
            </div>

            <div className="bg-blue-100 p-6 rounded-2xl shadow relative overflow-hidden">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-blue-800">People Served</h3>
                {connected && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
              </div>
              <p className="text-3xl font-bold mt-2">{stats.peopleServed || 0}</p>
              <div className="absolute bottom-0 right-0 w-16 h-16 opacity-10">
                <Users className="w-full h-full text-blue-800" />
              </div>
            </div>

            <div className="bg-purple-100 p-6 rounded-2xl shadow relative overflow-hidden">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-purple-800">CO₂ Emissions Prevented</h3>
                {connected && <span className="inline-block w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>}
              </div>
              <p className="text-3xl font-bold mt-2">{stats.emissionsPrevented || 0} tons</p>
              <div className="absolute bottom-0 right-0 w-16 h-16 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-purple-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 22h20M12 2v6M12 8l4 4M12 8l-4 4" />
                </svg>
              </div>
            </div>

            <div className="bg-yellow-100 p-6 rounded-2xl shadow relative overflow-hidden">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-yellow-800">Active Donations</h3>
                {connected && <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>}
              </div>
              <p className="text-3xl font-bold mt-2">{stats.activePosts || 0}</p>
              <div className="absolute bottom-0 right-0 w-16 h-16 opacity-10">
                <PlusCircle className="w-full h-full text-yellow-800" />
              </div>
            </div>

            {/* Real-time Activity Feed */}
            <div className="col-span-2 bg-white p-6 rounded-2xl shadow mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Real-time Activity Feed</h3>
                <div className="flex items-center">
                  {connected ? (
                    <span className="text-xs text-green-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
                      Live
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                      Disconnected
                    </span>
                  )}
                </div>
              </div>

              {activityFeed.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {activityFeed.map(activity => (
                    <div key={activity.id} className="border-l-4 pl-3 py-2 border-blue-400 bg-blue-50 rounded-r">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-blue-800">{activity.message}</span>
                        <span className="text-xs text-gray-500">{new Date(activity.time).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.type === 'new-food-post-created' && 'New food donation posted'}
                        {activity.type === 'food-post-status-changed' && `Status changed to ${activity.data?.status || 'unknown'}`}
                        {activity.type === 'user-verified' && 'User verification'}
                        {activity.type === 'post-expired' && 'Food post expired'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No activity recorded yet. Activities will appear here in real-time.</p>
                </div>
              )}
            </div>
          </div>
        );
      case "users":
        return (
          <div className="p-4 bg-white rounded-2xl shadow">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-green-700">User Management</h3>
                <p className="text-sm text-gray-600">View and moderate registered donors, receivers, and volunteers.</p>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-2">
                  Last updated: {lastUpdateTime.toLocaleTimeString()}
                </span>
                <button
                  onClick={fetchUsers}
                  className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded flex items-center"
                  disabled={isLoading.users}
                >
                  <RefreshCw size={14} className={`mr-1 ${isLoading.users ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
            {connected && (
              <div className="mb-4 flex items-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                <span className="text-xs text-green-600">Real-time updates active</span>
              </div>
            )}

            {/* Add NGO Form */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Onboard Verified NGO</h4>
              <form onSubmit={handleOnboardNGO} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">NGO Name</label>
                  <input
                    type="text"
                    name="name"
                    value={ngoData?.name || ''}
                    onChange={handleNGOInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={ngoData?.email || ''}
                    onChange={handleNGOInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    name="role"
                    value={ngoData?.role || 'receiver'}
                    onChange={handleNGOInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="receiver">Receiver (NGO)</option>
                    <option value="volunteer">Volunteer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  disabled={isOnboarding}
                >
                  {isOnboarding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlusCircle size={16} className="mr-2" /> Add NGO
                    </>
                  )}
                </button>
                {onboardError && (
                  <div className="p-2 bg-red-100 text-red-700 rounded-md text-sm">{onboardError}</div>
                )}
                {onboardSuccess && (
                  <div className="p-2 bg-green-100 text-green-700 rounded-md text-sm">{onboardSuccess}</div>
                )}
              </form>
            </div>

            {/* Users List */}
            {isLoading.users ? (
              <div className="flex justify-center items-center h-40">
                <RefreshCw size={24} className="animate-spin text-green-600" />
                <span className="ml-2 text-green-600">Loading users...</span>
              </div>
            ) : (
              <ul className="mt-6 space-y-2">
                {users.length === 0 ? (
                  <li className="p-4 bg-gray-50 rounded text-center text-gray-500">No users found</li>
                ) : (
                  users.map(user => (
                    <li key={user._id} className={`p-3 rounded shadow transition-all duration-300 ${user.isVerified ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{user.name}</span>
                          <span className="ml-2 text-sm text-gray-600">({user.role})</span>
                          {user.isVerified ? (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle size={12} className="mr-1" /> Verified
                            </span>
                          ) : (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-1"></span>
                              Pending Verification
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {!user.isVerified && (
                            <button
                              onClick={() => handleVerifyUser(user._id)}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                            >
                              Verify
                            </button>
                          )}
                          <button className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
                            Ban
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {user.email} • Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        );
      case "fraud":
        return (
          <div className="p-4 bg-white rounded-2xl shadow">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-red-600">Flagged / Expired Posts</h3>
                <p className="text-sm text-gray-600">Review expired food posts and posts flagged for misleading information.</p>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-2">
                  Last updated: {lastUpdateTime.toLocaleTimeString()}
                </span>
                <button
                  onClick={fetchFlaggedPosts}
                  className="text-xs bg-red-50 text-red-700 hover:bg-red-100 px-2 py-1 rounded flex items-center"
                  disabled={isLoading.fraud}
                >
                  <RefreshCw size={14} className={`mr-1 ${isLoading.fraud ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
            {connected && (
              <div className="mb-4 flex items-center">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
                <span className="text-xs text-red-600">Real-time alerts active</span>
              </div>
            )}

            {/* Flagged Posts List */}
            {isLoading.fraud ? (
              <div className="flex justify-center items-center h-40">
                <RefreshCw size={24} className="animate-spin text-red-600" />
                <span className="ml-2 text-red-600">Loading flagged posts...</span>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {flaggedPosts.length === 0 ? (
                  <li className="p-4 bg-gray-50 rounded text-center text-gray-500">No flagged posts found</li>
                ) : (
                  flaggedPosts.map(post => (
                    <li key={post._id} className="bg-red-50 p-4 rounded shadow relative overflow-hidden transition-all duration-300 hover:shadow-md">
                      {post.status === 'expired' && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-2 py-1 rounded-bl">
                          Expired
                        </div>
                      )}
                      {post.flagReason && (
                        <div className="absolute top-0 right-0 bg-yellow-600 text-white text-xs px-2 py-1 rounded-bl">
                          Flagged
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium flex items-center">
                            <AlertTriangle size={16} className="text-red-600 mr-2" />
                            {post.foodType} {post.category}
                          </h4>
                          <div className="mt-1 text-sm">
                            <p>Quantity: {post.quantity} kg</p>
                            <p>Posted by: {post.donorName || 'Unknown Donor'}</p>
                            <p className="text-red-600">
                              {post.status === 'expired'
                                ? `Expired on ${new Date(post.expiryWindow).toLocaleDateString()}`
                                : `Flagged for: ${post.flagReason || 'Suspicious activity'}`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Posted: {new Date(post.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        );
      case "onboard":
        return (
          <div className="p-4 bg-white rounded-2xl shadow">
            <h3 className="text-xl font-semibold mb-4 text-green-800">Onboard New NGO / Volunteer</h3>
            <form className="space-y-4" onSubmit={handleOnboardNGO}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization / Volunteer Name</label>
                <input
                  type="text"
                  name="name"
                  value={ngoData?.name || ''}
                  onChange={handleNGOInputChange}
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={ngoData?.email || ''}
                  onChange={handleNGOInputChange}
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={ngoData?.role || 'receiver'}
                  onChange={handleNGOInputChange}
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                >
                  <option value="receiver">Receiver (NGO)</option>
                  <option value="volunteer">Volunteer</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition flex items-center justify-center"
                disabled={isOnboarding}
              >
                {isOnboarding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>Add & Verify</>
                )}
              </button>
              {onboardError && (
                <div className="p-2 bg-red-100 text-red-700 rounded-md text-sm">{onboardError}</div>
              )}
              {onboardSuccess && (
                <div className="p-2 bg-green-100 text-green-700 rounded-md text-sm">{onboardSuccess}</div>
              )}
            </form>
          </div>
        );
      default:
        return null;
    }
  };

  // Admin Login Form
  const renderAdminLoginForm = () => {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full transform transition-all duration-500 animate-fadeIn">
          <h2 className="text-2xl font-bold text-green-700 mb-6 text-center">
            Admin Login
          </h2>
          {localAuthError && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">{localAuthError}</div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={userData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-colors duration-200"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                value={userData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-colors duration-200"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition duration-300 flex items-center justify-center transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Login to Admin Panel"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <LogIn size={16} className="mr-2" />
              )}
              Login
            </button>

          </form>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart className="w-5 h-5" /> },
    { id: "users", label: "Users", icon: <Users className="w-5 h-5" /> },
    { id: "fraud", label: "Fraud Reports", icon: <AlertTriangle className="w-5 h-5" /> },
    { id: "onboard", label: "Onboard NGO", icon: <PlusCircle className="w-5 h-5" /> },
  ];

  // Check if user is authenticated and has admin role
  if (!user || user.role !== 'admin') {
    return renderAdminLoginForm();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-4xl font-bold text-green-800">Admin Dashboard</h1>
            {connected ? (
              <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
                Live Data
              </span>
            ) : (
              <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                Offline
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdateTime.toLocaleTimeString()}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full border transition-all ${
                activeTab === tab.id
                  ? "bg-green-600 text-white"
                  : "bg-white border-green-300 text-green-700 hover:bg-green-100"
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        <div>{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminPanel;
