import React, { useState, useEffect, useContext } from "react";
import {
  Users,
  BarChart,
  AlertTriangle,
  PlusCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user } = useContext(AuthContext);
  const { connected, notifications, verifyUser } = useSocket();

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

  // Handle NGO onboarding
  const handleOnboardNGO = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const ngoData = {
      name: formData.get('name'),
      email: formData.get('email'),
      role: 'receiver',
      isVerified: true
    };

    try {
      const token = localStorage.getItem('accessToken');
      await axios.post('http://localhost:5002/api/users/onboard', ngoData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`${ngoData.name} has been onboarded successfully`);
      e.target.reset();
      fetchUsers();
    } catch (error) {
      console.error('Error onboarding NGO:', error);
      toast.error('Failed to onboard NGO');
    }
  };

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

  // Handle real-time notifications
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latestNotification = notifications[0];

      if (!latestNotification.read) {
        // Show toast notification based on type
        switch (latestNotification.type) {
          case 'new-food-post-created':
            toast.info('New food donation posted');
            if (activeTab === 'dashboard') fetchDashboardStats();
            break;
          case 'food-post-status-changed':
            toast.info(`Food post status changed to ${latestNotification.data.status}`);
            if (activeTab === 'dashboard') fetchDashboardStats();
            break;
          case 'food-post-expired':
            toast.warning('Food post has expired');
            if (activeTab === 'fraud') fetchFlaggedPosts();
            break;
          case 'user-verified':
            toast.success(`User ${latestNotification.data.name} has been verified`);
            if (activeTab === 'users') fetchUsers();
            break;
          default:
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
            <div className="bg-green-100 p-6 rounded-2xl shadow">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-green-800">Food Saved</h3>
                <button
                  onClick={fetchDashboardStats}
                  className="text-xs text-green-700 hover:text-green-900 flex items-center"
                  disabled={isLoading.dashboard}
                >
                  <RefreshCw size={14} className={`mr-1 ${isLoading.dashboard ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <p className="text-3xl font-bold mt-2">{stats.foodSaved || 0} kg</p>
            </div>
            <div className="bg-green-100 p-6 rounded-2xl shadow">
              <h3 className="text-lg font-semibold text-green-800">People Served</h3>
              <p className="text-3xl font-bold mt-2">{stats.peopleServed || 0}+</p>
            </div>
            <div className="bg-green-100 p-6 rounded-2xl shadow">
              <h3 className="text-lg font-semibold text-green-800">CO₂ Emission Prevented</h3>
              <p className="text-3xl font-bold mt-2">{stats.emissionsPrevented || 0} tons</p>
            </div>
            <div className="bg-green-100 p-6 rounded-2xl shadow">
              <h3 className="text-lg font-semibold text-green-800">Active Posts</h3>
              <p className="text-3xl font-bold mt-2">{stats.activePosts || 0}</p>
            </div>
          </div>
        );
      case "users":
        return (
          <div className="p-4 bg-white rounded-2xl shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-green-700">User Management</h3>
              <button
                onClick={fetchUsers}
                className="text-xs text-green-700 hover:text-green-900 flex items-center"
                disabled={isLoading.users}
              >
                <RefreshCw size={14} className={`mr-1 ${isLoading.users ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <p>View and moderate registered donors, receivers, and volunteers.</p>

            {/* Add NGO Form */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Onboard Verified NGO</h4>
              <form onSubmit={handleOnboardNGO} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">NGO Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <PlusCircle size={16} className="mr-2" /> Add NGO
                </button>
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
                    <li key={user._id} className="p-3 bg-green-50 rounded shadow">
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
                              Pending
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
              <h3 className="text-xl font-semibold text-red-600">Flagged / Expired Posts</h3>
              <button
                onClick={fetchFlaggedPosts}
                className="text-xs text-red-700 hover:text-red-900 flex items-center"
                disabled={isLoading.fraud}
              >
                <RefreshCw size={14} className={`mr-1 ${isLoading.fraud ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <p>Review expired food posts and posts flagged for misleading information.</p>

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
                    <li key={post._id} className="bg-red-50 p-4 rounded shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">
                            ⚠️ {post.status === 'expired' ? 'Expired Post' : 'Flagged Post'}: {post.foodType} {post.category}
                          </h4>
                          <div className="mt-1 text-sm">
                            <p>Quantity: {post.quantity} kg</p>
                            <p>Posted by: {post.donorName}</p>
                            <p className="text-red-600">
                              {post.status === 'expired'
                                ? `Expired on ${new Date(post.expiryWindow).toLocaleDateString()}`
                                : `Flagged for: ${post.flagReason || 'Suspicious activity'}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
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
            <form className="space-y-4">
              <input
                type="text"
                placeholder="Organization / Volunteer Name"
                className="w-full px-4 py-3 border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 border rounded-lg"
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition"
              >
                Add & Verify
              </button>
            </form>
          </div>
        );
      default:
        return null;
    }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart className="w-5 h-5" /> },
    { id: "users", label: "Users", icon: <Users className="w-5 h-5" /> },
    { id: "fraud", label: "Fraud Reports", icon: <AlertTriangle className="w-5 h-5" /> },
    { id: "onboard", label: "Onboard NGO", icon: <PlusCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-green-800 text-center">Admin Dashboard</h1>

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
