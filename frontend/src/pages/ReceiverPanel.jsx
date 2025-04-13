import React, { useState, useEffect, useContext } from 'react';
import { MapPin, UserCheck, Users, User, Calendar, Search, Filter, CheckCircle, Star, Send, RefreshCw, Navigation } from "lucide-react";
import FoodDonationMap from '../components/FoodDonationMap';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ReceiverPanel = () => {
  const { user, login, register, loading } = useContext(AuthContext);
  const { connected, notifications, joinFoodPostRoom, updateFoodPostStatus, socket } = useSocket();

  // Authentication States
  const [authMode, setAuthMode] = useState('login');
  const [localAuthError, setLocalAuthError] = useState('');
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    name: '',
    receiverType: 'individual',
  });

  // Receiver Panel States
  const [activeTab, setActiveTab] = useState("map");
  const [userType, setUserType] = useState("");
  const [isVerified, setIsVerified] = useState(user?.isVerified || false);
  const [foodItems, setFoodItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    maxDistance: 5000, // Default 5km
    foodType: 'all',
    sortBy: 'distance' // Default sort by distance
  });
  const [requestedItems, setRequestedItems] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedForDirections, setSelectedForDirections] = useState(null);

  // Get user's location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Unable to get your location. Please enable location services.");
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
    }
  }, []);

  // Fetch nearby food posts
  const fetchNearbyFoodPosts = async () => {
    try {
      if (!userLocation) {
        console.log('No user location available');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const response = await axios.get(`http://localhost:5002/api/food-posts/nearby`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        params: {
          latitude: userLocation.lat || 17.3850,
          longitude: userLocation.lng || 78.4867,
          maxDistance: filters.maxDistance || 1000000
        }
      });

      setFoodItems(response.data);
      setIsLoading(false);
      return response.data; // Return the posts for promise handling
    } catch (error) {
      console.error('Error fetching nearby food posts:', error);
      setErrorMessage('Failed to fetch nearby food posts');
      setIsLoading(false);
      return Promise.reject(error); // Reject the promise for error handling
    }
  };

  // Fetch food posts when component mounts or filters change
  useEffect(() => {
    if (user && isVerified) {
      console.log('Fetching food posts on mount or filter change');
      setIsLoading(true);
      fetchNearbyFoodPosts()
        .then(posts => {
          console.log(`Fetched ${posts?.length || 0} food posts`);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching food posts:', error);
          setIsLoading(false);
        });
    }
  }, [user, isVerified, filters.maxDistance]);

  // Set up real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for new food posts
    socket.on('new-food-post', (newPost) => {
      setFoodItems(prevItems => {
        // Check if post is within current distance filter
        if (newPost.distance <= filters.maxDistance) {
          return [...prevItems, newPost].sort((a, b) => a.distance - b.distance);
        }
        return prevItems;
      });
    });

    // Listen for food post updates
    socket.on('food-post-updated', (updatedPost) => {
      setFoodItems(prevItems =>
        prevItems.map(item =>
          item._id === updatedPost._id ? updatedPost : item
        ).sort((a, b) => a.distance - b.distance)
      );
    });

    // Listen for food post deletions
    socket.on('food-post-deleted', (postId) => {
      setFoodItems(prevItems =>
        prevItems.filter(item => item._id !== postId)
      );
    });

    return () => {
      socket.off('new-food-post');
      socket.off('food-post-updated');
      socket.off('food-post-deleted');
    };
  }, [socket, filters.maxDistance]);

  // Set user type and verification status when user changes
  useEffect(() => {
    if (user && user.role === 'receiver') {
      // If user has a receiverType property, use it, otherwise default to 'individual'
      setUserType(user.receiverType || 'individual');

      // Check if user is verified by admin (server-side verification)
      if (user.isVerified) {
        // If verified by admin, set isVerified to true and save to localStorage
        setIsVerified(true);
        localStorage.setItem('receiverVerified', 'true');
      } else {
        // If not verified by admin, check localStorage for self-verification
        const savedVerificationStatus = localStorage.getItem('receiverVerified');
        if (savedVerificationStatus === 'true') {
          setIsVerified(true);
        } else {
          setIsVerified(false);
        }
      }
    }
  }, [user]);

  // Fetch food posts on component mount and when filters change
  useEffect(() => {
    if (user && isVerified) {
      console.log('User is verified, fetching food posts...');
      fetchNearbyFoodPosts()
        .then(posts => {
          console.log('Successfully fetched food posts:', posts?.length || 0);
        })
        .catch(error => {
          console.error('Error fetching food posts:', error);
        });
    } else {
      console.log('User not verified or not logged in, skipping food post fetch');
    }
  }, [user, isVerified, filters.maxDistance]);

  // This auto-verification logic is now handled in the main useEffect above

  // Refresh food posts periodically
  useEffect(() => {
    if (user && isVerified) {
      console.log('Setting up periodic refresh for food posts');

      // Set up interval to refresh every 30 seconds
      const intervalId = setInterval(() => {
        console.log('Periodic refresh: fetching food posts...');
        fetchNearbyFoodPosts()
          .then(posts => {
            console.log('Periodic refresh successful, got', posts?.length || 0, 'posts');
          })
          .catch(error => {
            console.error('Error in periodic refresh:', error);
          });
      }, 30000); // Every 30 seconds

      // Clean up interval on unmount
      return () => {
        console.log('Cleaning up periodic refresh interval');
        clearInterval(intervalId);
      };
    }
  }, [user, isVerified]);

  // Join food post rooms for real-time updates
  useEffect(() => {
    if (connected && socket && foodItems.length > 0) {
      console.log('Joining food post rooms for real-time updates');

      // Join rooms for all visible food posts
      foodItems.forEach(item => {
        joinFoodPostRoom(item.id);
        console.log(`Joined room for food post: ${item.id}`);
      });

      // Join rooms for requested items
      requestedItems.forEach(itemId => {
        if (!foodItems.some(item => item.id === itemId)) {
          joinFoodPostRoom(itemId);
          console.log(`Joined room for requested food post: ${itemId}`);
        }
      });
    }
  }, [connected, socket, foodItems, requestedItems, joinFoodPostRoom]);

  // Listen for broadcast food post events
  useEffect(() => {
    if (connected && socket) {
      console.log('Setting up socket event listeners for food posts');

      // Add listener for broadcast food post events
      socket.on('broadcast-food-post', (data) => {
        console.log('Received broadcast food post event:', data);
        toast.success('New food donation has been posted!', {
          icon: '🍲',
          duration: 5000
        });
        // Refresh the food posts to get the latest data
        fetchNearbyFoodPosts()
          .then(() => console.log('Successfully refreshed food posts after broadcast event'))
          .catch(err => console.error('Failed to refresh food posts after broadcast event:', err));
      });

      // Add listener for new food post available events
      socket.on('new-food-post-available', (data) => {
        console.log('Received new food post available event:', data);
        toast.success(`New food donation posted by ${data.donorName || 'a donor'}!`, {
          icon: '🍲',
          duration: 5000
        });
        // Refresh the food posts to get the latest data
        fetchNearbyFoodPosts()
          .then(() => console.log('Successfully refreshed food posts after new post event'))
          .catch(err => console.error('Failed to refresh food posts after new post event:', err));
      });

      // Clean up listeners on unmount
      return () => {
        console.log('Cleaning up socket event listeners');
        socket.off('broadcast-food-post');
        socket.off('new-food-post-available');
      };
    }
  }, [connected, socket]);

  // Handle real-time notifications
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latestNotification = notifications[0];

      if (!latestNotification.read) {
        switch (latestNotification.type) {
          case 'new-food-post':
            console.log('New food post notification received:', latestNotification.data);

            // Show a toast notification
            toast.success(`New food donation available from ${latestNotification.data?.donorName || 'a donor'}!`, {
              icon: '🍲',
              duration: 5000
            });

            // Refresh the food posts to get the latest data
            fetchNearbyFoodPosts()
              .then(() => console.log('Successfully refreshed food posts after notification'))
              .catch(err => console.error('Failed to refresh food posts after notification:', err));
            break;
          case 'fields-updated':
            toast.info('A food donation has been updated!');
            fetchNearbyFoodPosts(); // Refresh food items
            break;
          case 'status-changed':
            toast.info(`Food donation status changed to ${latestNotification.data.status}`);
            fetchNearbyFoodPosts(); // Refresh food items
            break;
          case 'pickup-fields-updated':
            toast.info('A donation you accepted has been updated!');
            fetchNearbyFoodPosts(); // Refresh food items
            break;
          case 'account-verified':
            toast.success('Your account has been verified by an administrator!');
            setIsVerified(true);
            localStorage.setItem('receiverVerified', 'true');
            fetchNearbyFoodPosts(); // Refresh food items
            break;
        }
      }
    }
  }, [notifications, fetchNearbyFoodPosts]);

  const filterBySearch = (item) => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.location.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const filterByDistance = (item) => {
    return item.distance <= filters.maxDistance;
  };

  const filterByFoodType = (item) => {
    return filters.foodType === "all" || item.type === filters.foodType;
  };

  const filterByFreshness = (item) => {
    if (filters.freshness === "all") return true;
    if (filters.freshness === "today") return item.expiryDays === 0;
    if (filters.freshness === "tomorrow") return item.expiryDays === 1;
    if (filters.freshness === "thisWeek") return item.expiryDays <= 7;
    return true;
  };

  const filterByCategory = (item) => {
    return filters.category === "all" || item.perishable === filters.category;
  };

  const filteredItems = foodItems.filter(item =>
    filterBySearch(item) &&
    filterByDistance(item) &&
    filterByFoodType(item) &&
    filterByFreshness(item) &&
    filterByCategory(item)
  );

  const handleRequestItem = async (item) => {
    try {
      if (!user) {
        toast.error('Please login to request food');
        return;
      }

      // Show confirmation dialog before accepting
      if (!window.confirm(`Are you sure you want to accept ${item.name}? You will be responsible for picking it up.`)) {
        return;
      }

      toast.loading('Processing your request...', { id: 'request-loading' });

      const token = localStorage.getItem('accessToken');
      await axios.put(`http://localhost:5002/api/food-posts/accept/${item.id}`, {
        // Include receiver's current location for better tracking
        latitude: userLocation?.lat,
        longitude: userLocation?.lng
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add to requested items locally
      setRequestedItems([...requestedItems, item.id]);

      // Join the food post room for real-time updates
      joinFoodPostRoom(item.id);

      toast.dismiss('request-loading');
      toast.success(`Successfully accepted ${item.name}. You can now navigate to the pickup location.`);

      // Update the item status locally
      setFoodItems(prevItems =>
        prevItems.map(foodItem =>
          foodItem.id === item.id ? { ...foodItem, status: 'accepted' } : foodItem
        )
      );

      // Refresh food items to get the latest status
      setTimeout(() => fetchNearbyFoodPosts(), 1000);
    } catch (error) {
      console.error('Error requesting item:', error);
      toast.dismiss('request-loading');
      toast.error(error.response?.data?.message || 'Failed to accept food item');
    }
  };

  const handleConfirmReceipt = (item) => {
    setCurrentItem(item);
    setShowConfirmation(true);
  };

  // Handle selecting a donation on the map
  const handleSelectDonation = (itemId) => {
    setSelectedDonation(itemId);
    // Scroll to the item if in list view
    if (activeTab === 'list') {
      const element = document.getElementById(`food-item-${itemId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Authentication functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (authMode === 'login' || authMode === 'register') {
      setUserData((prev) => ({ ...prev, [name]: value }));
      setLocalAuthError('');
    } else {
      // For other form inputs
      if (name === 'searchQuery') {
        setSearchQuery(value);
      } else if (name === 'feedback') {
        setFeedback(value);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login with:', userData.email);
      const response = await login(userData.email, userData.password);

      // Check if the user has the receiver role
      if (response && response.user && response.user.role !== 'receiver') {
        // Single clear message for wrong role
        toast.error('Login failed. This panel is only for receivers. Please use the donor panel instead.');

        // Clear local error to avoid duplicate messages
        setLocalAuthError('');

        // Force logout if the user is not a receiver
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.reload();
        return;
      }

      toast.success(`Welcome back, ${response.user.name || 'Receiver'}!`);

      setUserData({ email: '', password: '', name: '', receiverType: 'individual' });
      // After successful login, set isVerified based on user data
      if (response && response.user) {
        // If verified by admin, set isVerified to true and save to localStorage
        if (response.user.isVerified) {
          setIsVerified(true);
          localStorage.setItem('receiverVerified', 'true');
        } else {
          // If not verified by admin, check localStorage for self-verification
          const savedVerificationStatus = localStorage.getItem('receiverVerified');
          if (savedVerificationStatus === 'true') {
            setIsVerified(true);
          } else {
            setIsVerified(false);
          }
        }
      }
    } catch (error) {
      console.error('Login error in component:', error);
      const errorMessage = error.message || 'Login failed';
      setLocalAuthError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Validate password
      if (userData.password.length < 8) {
        const errorMsg = 'Password must be at least 8 characters long';
        setLocalAuthError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      console.log('Attempting registration with:', userData);
      const role = 'receiver'; // Always set role to receiver for this panel
      const response = await register({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role,
        receiverType: userData.receiverType,
        phone: '1234567890', // Placeholder, add phone input if needed
      });

      // Verify the registered user has the receiver role
      if (response && response.user && response.user.role !== 'receiver') {
        // Single clear message for wrong role during registration
        toast.error('Registration failed. This panel is only for receivers. Please use the donor panel to register as a donor.');

        // Force logout if the user is not registered as a receiver
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return;
      }

      // After successful registration, automatically set userType
      setUserType(userData.receiverType);
      setUserData({ email: '', password: '', name: '', receiverType: 'individual' });

      // New users need verification
      setIsVerified(false);
      toast.success('Registration successful! Please complete verification to access food donations.');
    } catch (error) {
      console.error('Registration error in component:', error);
      const errorMessage = error.message || 'Registration failed';
      setLocalAuthError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Reset states when user changes
  useEffect(() => {
    if (!user) {
      setUserType("");
      setIsVerified(false);
    }
  }, [user]);

  // Confirmation submission function
  const submitConfirmation = async () => {
    try {
      if (!currentItem) return;

      const token = localStorage.getItem('accessToken');
      await axios.put(`http://localhost:5002/api/food-posts/confirm/${currentItem.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update food post status via socket
      updateFoodPostStatus(currentItem.id, 'picked');

      // Submit feedback if provided
      if (rating > 0 || feedback.trim()) {
        await axios.post('http://localhost:5002/api/feedback', {
          postId: currentItem.id,
          rating,
          comment: feedback
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // Update local state
      const newRequestedItems = requestedItems.filter(id => id !== currentItem.id);
      setRequestedItems(newRequestedItems);
      setShowConfirmation(false);
      setRating(0);
      setFeedback("");

      toast.success("Thank you for confirming receipt and providing feedback!");
    } catch (error) {
      console.error('Error confirming receipt:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm receipt');
    }
  };

  const foodTypeOptions = [
    { value: "all", label: "All Types" },
    { value: "veg", label: "Vegetarian" },
    { value: "non-veg", label: "Non-Vegetarian" }
  ];

  const freshnessOptions = [
    { value: "all", label: "All" },
    { value: "today", label: "Today Only" },
    { value: "tomorrow", label: "By Tomorrow" },
    { value: "thisWeek", label: "This Week" }
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "perishable", label: "Perishable" },
    { value: "non-perishable", label: "Non-Perishable" }
  ];

  // Authentication Form
  const renderAuthForm = () => {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className={`bg-white p-8 rounded-xl shadow-lg max-w-md w-full transform transition-all duration-500 ${authMode === 'login' ? 'animate-fadeIn' : 'animate-slideIn'}`}>
          <h2 className="text-2xl font-bold text-green-700 mb-6 text-center">
            {authMode === 'login' ? 'Welcome to Receiver Portal' : 'Join as Food Receiver'}
          </h2>
          {localAuthError && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">{localAuthError}</div>
          )}
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authMode === 'register' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name / Organization Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={userData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-colors duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setUserData(prev => ({ ...prev, receiverType: 'ngo' }))}
                      className={`flex items-center p-3 border rounded-md transition-colors duration-200 ${userData.receiverType === 'ngo' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'}`}
                    >
                      <Users size={16} className="mr-2" />
                      <div className="text-left">
                        <p className="font-medium">Non-Governmental Organization (NGO)</p>
                        <p className="text-xs text-gray-500">For registered charities and organizations</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserData(prev => ({ ...prev, receiverType: 'individual' }))}
                      className={`flex items-center p-3 border rounded-md transition-colors duration-200 ${userData.receiverType === 'individual' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'}`}
                    >
                      <User size={16} className="mr-2" />
                      <div className="text-left">
                        <p className="font-medium">Individual</p>
                        <p className="text-xs text-gray-500">For individuals in need of food assistance</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserData(prev => ({ ...prev, receiverType: 'volunteer' }))}
                      className={`flex items-center p-3 border rounded-md transition-colors duration-200 ${userData.receiverType === 'volunteer' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'}`}
                    >
                      <UserCheck size={16} className="mr-2" />
                      <div className="text-left">
                        <p className="font-medium">Volunteer</p>
                        <p className="text-xs text-gray-500">For those looking to help with food distribution</p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
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
                minLength={authMode === 'register' ? 8 : undefined}
              />
              {authMode === 'register' && (
                <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
              )}
            </div>
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserData(prev => ({ ...prev, receiverType: 'individual' }))}
                    className={`flex items-center justify-center p-2 border rounded-md transition-colors duration-200 ${userData.receiverType === 'individual' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'}`}
                  >
                    <User size={16} className="mr-2" />
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserData(prev => ({ ...prev, receiverType: 'ngo' }))}
                    className={`flex items-center justify-center p-2 border rounded-md transition-colors duration-200 ${userData.receiverType === 'ngo' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'}`}
                  >
                    <Users size={16} className="mr-2" />
                    NGO/Charity
                  </button>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition duration-300 flex items-center justify-center transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={authMode === 'login' ? 'Login to ZeroWaste' : 'Create ZeroWaste account'}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                authMode === 'login' ? <Send size={16} className="mr-2" /> : <User size={16} className="mr-2" />
              )}
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
            <div className="flex items-center justify-center">
              <span className="text-sm text-gray-600">
                {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setLocalAuthError('');
                  }}
                  className="text-green-500 hover:text-green-700 font-medium transition-colors duration-200"
                  aria-label={`Switch to ${authMode === 'login' ? 'registration' : 'login'} form`}
                >
                  {authMode === 'login' ? 'Register' : 'Login'}
                </button>
              </span>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Receiver Dashboard Header
  const renderReceiverHeader = () => {
    return (
      <header className="bg-green-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Food Receiver Portal</h1>
          <div className="flex items-center space-x-4">
            {isVerified ? (
              <span className="flex items-center bg-green-700 px-3 py-1 rounded-full text-sm">
                <UserCheck size={16} className="mr-1" /> Verified Account
              </span>
            ) : (
              <span className="flex items-center bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm">
                Verification Pending
              </span>
            )}
          </div>
        </div>
      </header>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Show auth form if user is not logged in */}
      {!user || user.role !== 'receiver' ? (
        renderAuthForm()
      ) : (
        <>
          {/* Header */}
          {renderReceiverHeader()}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Confirm Receipt</h3>
            <p>Please confirm you've received: <span className="font-medium">{currentItem?.name}</span> from <span className="font-medium">{currentItem?.location}</span></p>

            <div className="my-4">
              <p className="mb-2">Rate your experience (optional):</p>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`cursor-pointer ${rating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Feedback (optional):</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded"
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience..."
              ></textarea>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={submitConfirmation}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
              >
                Confirm Receipt
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4">
        {user && !isVerified && !user.isVerified ? (
          <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">Complete Verification</h2>
            <p className="mb-4 text-gray-600">Please provide additional information to verify your account as a {userType === 'ngo' ? 'Non-Governmental Organization' : userType === 'volunteer' ? 'Volunteer' : 'Individual'}.</p>

            <form onSubmit={(e) => {
              e.preventDefault();
              setIsVerified(true);
              // Save verification status to localStorage
              localStorage.setItem('receiverVerified', 'true');

              // Show detailed success message
              toast.success('Verification completed successfully! You can now access food donations near you.', {
                duration: 5000, // Show for 5 seconds
                icon: '✅'
              });

              // Fetch food posts immediately after verification
              setTimeout(() => {
                // Use the direct API call to get all food posts
                const token = localStorage.getItem('accessToken');
                console.log('Fetching all food posts after verification...');

                axios.get('http://localhost:5002/api/food-posts/nearby', {
                  headers: { Authorization: `Bearer ${token}` },
                  params: {
                    latitude: 17.3850,
                    longitude: 78.4867,
                    maxDistance: 100000 // 100km radius for testing
                  }
                })
                .then(response => {
                  console.log('Verification food posts response:', response.data);

                  if (response.data && response.data.length > 0) {
                    // Transform API response to match our UI format
                    const posts = response.data.map(post => {
                      // Calculate days until expiry
                      const expiryDate = new Date(post.expiryWindow);
                      const today = new Date();
                      const diffTime = expiryDate - today;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      // Format expiry text
                      let expiryText = '';
                      if (diffDays < 0) {
                        expiryText = 'Expired';
                      } else if (diffDays === 0) {
                        expiryText = 'Today';
                      } else if (diffDays === 1) {
                        expiryText = 'Tomorrow';
                      } else {
                        expiryText = `In ${diffDays} days`;
                      }

                      return {
                        id: post._id,
                        name: `${post.foodType === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'} ${post.category}`,
                        location: post.location.address || 'Location available on map',
                        distance: post.distance / 1000, // Convert meters to kilometers
                        distanceText: `${(post.distance / 1000).toFixed(1)} km`,
                        expires: expiryText,
                        expiryDays: diffDays,
                        quantity: `${post.quantity} kgs`,
                        type: post.foodType,
                        perishable: post.category, // Add perishable field
                        donorId: post.donorId,
                        imageUrl: post.imageUrl,
                        notes: post.notes || 'No additional notes'
                      };
                    });

                    setFoodItems(posts);
                  }
                })
                .catch(error => {
                  console.error('Error fetching food posts after verification:', error);
                });
              }, 1000);
            }}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Full Name / Organization Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  defaultValue={user?.name || ''}
                  disabled
                  required
                />
                <p className="text-xs text-gray-500 mt-1">This is the name you registered with</p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  className="w-full p-2 border border-gray-300 rounded"
                  defaultValue={user?.email || ''}
                  disabled
                  required
                />
                <p className="text-xs text-gray-500 mt-1">This is the email you registered with</p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Address</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded"
                  rows="3"
                  required
                ></textarea>
              </div>

              {userType === "ngo" && (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Registration Number</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
              )}

              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Upload ID / Documentation</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <p className="mb-2 text-sm text-gray-500">Click to upload documents</p>
                      <p className="text-xs text-gray-500">PDF, JPG or PNG (Max 5MB)</p>
                    </div>
                    <input type="file" className="hidden" />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 flex items-center justify-center"
              >
                <UserCheck size={16} className="mr-2" />
                Submit for Verification
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">Your account will be reviewed by our team. You'll be notified once verified.</p>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex border-b mb-6">
              <button
                onClick={() => setActiveTab("map")}
                className={`py-2 px-4 ${activeTab === "map" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500"}`}
              >
                <div className="flex items-center">
                  <MapPin className="mr-1" size={16} />
                  Food Map
                </div>
              </button>
              <button
                onClick={() => setActiveTab("list")}
                className={`py-2 px-4 ${activeTab === "list" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500"}`}
              >
                <div className="flex items-center">
                  <Calendar className="mr-1" size={16} />
                  Available Food
                </div>
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`py-2 px-4 ${activeTab === "requests" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500"}`}
              >
                <div className="flex items-center">
                  <Send className="mr-1" size={16} />
                  My Requests
                  {requestedItems.length > 0 && (
                    <span className="ml-2 bg-green-600 text-white text-xs rounded-full px-2 py-1">
                      {requestedItems.length}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Search and Filter */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by food type or location..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  className="absolute right-3 top-2 p-1 text-gray-500 hover:text-green-600"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={18} />
                </button>
              </div>

              {showFilters && (
                <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <h4 className="font-medium text-gray-700 mb-3">Filter Options</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Maximum Distance</label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="0.5"
                          max="10"
                          step="0.5"
                          className="w-full mr-2"
                          value={filters.maxDistance}
                          onChange={(e) => setFilters({...filters, maxDistance: parseFloat(e.target.value)})}
                        />
                        <span className="text-sm w-16 text-right">{filters.maxDistance} miles</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Food Type</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={filters.foodType}
                        onChange={(e) => setFilters({...filters, foodType: e.target.value})}
                      >
                        {foodTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Freshness</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={filters.freshness}
                        onChange={(e) => setFilters({...filters, freshness: e.target.value})}
                      >
                        {freshnessOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Category</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                      >
                        {categoryOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {activeTab === "map" ? (
              <div className="bg-white p-4 rounded-lg shadow-md relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                      <p className="mt-2 text-green-600 font-medium">Loading food donations...</p>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    <p>{errorMessage}</p>
                    <button
                      onClick={() => {
                        setErrorMessage(null);
                        fetchNearbyFoodPosts();
                      }}
                      className="mt-2 text-sm text-red-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}
                <FoodDonationMap
                  foodItems={filteredItems.map(item => {
                    // Generate consistent coordinates based on item id
                    const itemId = parseInt(item.id.toString().replace(/[^0-9]/g, '') || '0');
                    const randomLat = 17.3850 + (itemId % 10) * 0.01;
                    const randomLng = 78.4867 + (itemId % 5) * 0.01;

                    return {
                      ...item,
                      lat: item.lat || randomLat, // Fallback coordinates
                      lng: item.lng || randomLng  // Fallback coordinates
                    };
                  })}
                  onSelectItem={handleSelectDonation}
                  userLocation={userLocation || { lat: 17.3850, lng: 78.4867 }}
                  initialSelectedForDirections={selectedForDirections || null}
                />

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">Food Donation Locations</h3>
                    <button
                      onClick={() => {
                        toast.loading('Refreshing food donations...', { id: 'refresh-toast' });
                        fetchNearbyFoodPosts().then(() => {
                          toast.dismiss('refresh-toast');
                          toast.success('Food donations refreshed!');
                        }).catch(() => {
                          toast.dismiss('refresh-toast');
                          toast.error('Failed to refresh. Please try again.');
                        });
                      }}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1"
                      title="Refresh food donations"
                    >
                      <RefreshCw size={16} />
                      <span className="text-sm">Refresh</span>
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {filteredItems
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by newest first
                      .map(item => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedForDirections(item)}
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.location}</p>
                          </div>
                          <div className="text-sm text-gray-600">{item.distanceText}</div>
                        </div>
                      ))
                    }
                    {filteredItems.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No results match your filters. Try adjusting your search.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === "list" ? (
              <div className="bg-white p-4 rounded-lg shadow-md relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                      <p className="mt-2 text-green-600 font-medium">Loading food donations...</p>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    <p>{errorMessage}</p>
                    <button
                      onClick={() => {
                        setErrorMessage(null);
                        fetchNearbyFoodPosts();
                      }}
                      className="mt-2 text-sm text-red-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Available Food Donations</h3>
                    <p className="text-sm text-gray-500">
                      Showing {filteredItems.length} donations from donors
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      toast.loading('Refreshing food donations...', { id: 'refresh-toast' });
                      fetchNearbyFoodPosts().then(() => {
                        toast.dismiss('refresh-toast');
                        toast.success('Food donations refreshed!');
                      }).catch(() => {
                        toast.dismiss('refresh-toast');
                        toast.error('Failed to refresh. Please try again.');
                      });
                    }}
                    className="text-green-600 hover:text-green-700 flex items-center gap-1"
                    title="Refresh food donations"
                  >
                    <RefreshCw size={16} />
                    <span className="text-sm">Refresh</span>
                  </button>
                </div>

                {/* Quick filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setFilters({...filters, foodType: 'all'})}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.foodType === 'all'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilters({...filters, foodType: 'veg'})}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.foodType === 'veg'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Vegetarian
                  </button>
                  <button
                    onClick={() => setFilters({...filters, foodType: 'non-veg'})}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.foodType === 'non-veg'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Non-Vegetarian
                  </button>
                  <button
                    onClick={() => setFilters({...filters, category: 'perishable'})}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.category === 'perishable'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Perishable
                  </button>
                  <button
                    onClick={() => setFilters({...filters, category: 'non-perishable'})}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.category === 'non-perishable'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Non-Perishable
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      id={`food-item-${item.id}`}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      {item.imageUrl && (
                        <div className="mb-3 relative">
                          <img
                            src={item.imageUrl}
                            alt="Food donation"
                            className="w-full h-40 object-cover rounded-md"
                          />
                          <div className="absolute top-2 right-2">
                            <span className={`text-sm py-1 px-2 rounded-full ${
                              item.expiryDays === 0
                                ? 'bg-red-500 text-white'
                                : item.expiryDays <= 2
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-green-500 text-white'
                            }`}>
                              {item.expires}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-green-600">{item.name}</h4>
                          <p className="text-xs text-gray-500">by {item.donorName}</p>
                        </div>
                        <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {item.distanceText}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="font-medium">Quantity:</span> {item.quantity}
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="font-medium">Type:</span> {item.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                        </div>
                      </div>

                      {item.notes && item.notes !== 'No additional notes' && (
                        <div className="text-sm bg-gray-50 p-2 rounded mb-3">
                          <span className="font-medium">Notes:</span> {item.notes}
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-3">
                        <div className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          {requestedItems.includes(item.id) ? (
                            <>
                              <span className="text-sm text-green-600 flex items-center">
                                <CheckCircle size={16} className="mr-1" /> Accepted
                              </span>
                              <button
                                className="bg-blue-600 text-white text-sm py-1 px-3 rounded hover:bg-blue-700 flex items-center"
                                onClick={() => {
                                  setActiveTab("map");
                                  setSelectedForDirections(item);
                                }}
                              >
                                <Navigation size={14} className="mr-1" /> Navigate
                              </button>
                            </>
                          ) : (
                            <button
                              className="bg-green-600 text-white text-sm py-1 px-3 rounded hover:bg-green-700"
                              onClick={() => handleRequestItem(item)}
                            >
                              Request
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredItems.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No food items match your search criteria.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilters({
                          maxDistance: 100,
                          foodType: 'all',
                          freshness: 'all',
                          category: 'all'
                        });
                      }}
                      className="mt-4 text-green-600 hover:text-green-700"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="font-semibold text-lg mb-4">My Requests</h3>

                {requestedItems.length > 0 ? (
                  <div className="space-y-4">
                    {foodItems
                      .filter(item => requestedItems.includes(item.id))
                      .map(item => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between mb-2">
                            <h4 className="font-medium text-green-600">{item.name}</h4>
                            <span className="text-sm bg-blue-100 text-blue-800 py-1 px-2 rounded">
                              Status: Ready for Pickup
                            </span>
                          </div>

                          {item.imageUrl && (
                            <div className="mb-3">
                              <img
                                src={item.imageUrl}
                                alt="Food donation"
                                className="w-full h-40 object-cover rounded-md"
                              />
                            </div>
                          )}

                          <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>{item.location}</span>
                            <span>{item.distanceText}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="text-sm bg-gray-100 p-2 rounded">
                              <span className="font-medium">Quantity:</span> {item.quantity}
                            </div>
                            <div className="text-sm bg-gray-100 p-2 rounded">
                              <span className="font-medium">Type:</span> {item.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                            </div>
                          </div>

                          <div className="text-sm bg-gray-100 p-2 rounded mb-3">
                            <span className="font-medium">Expires:</span> {item.expires}
                          </div>

                          <div className="flex justify-between items-center mt-3">
                            <span className="text-sm">{item.quantity}</span>
                            <button
                              className="bg-green-600 text-white text-sm py-1 px-3 rounded hover:bg-green-700"
                              onClick={() => handleConfirmReceipt(item)}
                            >
                              Confirm Receipt
                            </button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">You haven't requested any food items yet.</p>
                    <button
                      onClick={() => setActiveTab("list")}
                      className="mt-4 text-green-600 hover:text-green-700"
                    >
                      Browse Available Food
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t p-4 text-center text-gray-500 text-sm">
        Food Recovery Network &copy; 2025 - Connecting surplus food with those who need it
      </footer>
        </>
      )}
    </div>
  );
};

export default ReceiverPanel;