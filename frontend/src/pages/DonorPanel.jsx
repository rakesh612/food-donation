import React, { useState, useRef, useEffect, useContext } from 'react';
import { UploadCloud, Calendar, Clock, MapPin, Send, Check, Truck, CheckCircle, X, Menu, User, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const DonorPanel = () => {
  const { user, login, register, logout, loading } = useContext(AuthContext);
  const { connected, notifications, joinFoodPostRoom, socket } = useSocket();

  // Authentication States
  const [authMode, setAuthMode] = useState('login');
  const [localAuthError, setLocalAuthError] = useState('');
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    name: '',
    donorType: 'individual',
  });

  // Donation Form States
  const [donationForm, setDonationForm] = useState({
    quantity: '',
    estimatedQuantity: '',
    type: 'veg',
    perishable: 'perishable',
    expiryDate: '',
    expiryTime: '',
    location: '',
    locationCoords: { lat: null, lng: null },
    notes: '',
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Donations Tracking State
  const [donations, setDonations] = useState([]);

  const fileInputRef = useRef(null);

  // Fetch Donations
  useEffect(() => {
    if (user) {
      fetchDonations();
      getUserLocation();
    }
  }, [user]);

  // Handle socket connections and notifications
  useEffect(() => {
    // Join rooms for each donation
    if (user && connected && donations.length > 0) {
      donations.forEach(donation => {
        joinFoodPostRoom(donation.id);
      });
    }
  }, [user, connected, donations]);

  // Handle notifications
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      // Process new notifications
      const latestNotification = notifications[0];

      if (!latestNotification.read) {
        // Show toast notification based on type
        switch (latestNotification.type) {
          case 'donation-accepted':
            toast.success('Your donation has been accepted by a receiver');
            fetchDonations(); // Refresh donations list
            break;
          case 'donation-picked':
            toast.success('Your donation has been picked up');
            fetchDonations(); // Refresh donations list
            break;
          case 'donation-verified':
            toast.success('Your donation has been verified by an admin');
            fetchDonations(); // Refresh donations list
            break;
          default:
            break;
        }
      }
    }
  }, [notifications]);

  const fetchDonations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.get('http://localhost:5002/api/food-posts', {
        headers: { Authorization: `Bearer ${token}` },
        params: { donorId: user.id }, // Filter by donor
      });
      setDonations(
        res.data.map((post) => ({
          id: post._id,
          image: post.imageUrl || '/api/placeholder/150/150',
          quantity: `${post.quantity} kgs`,
          type: post.foodType,
          perishable: post.category,
          expiryDate: new Date(post.expiryWindow).toISOString().split('T')[0],
          expiryTime: new Date(post.expiryWindow).toTimeString().slice(0, 5),
          status: post.status,
          createdAt: post.createdAt,
          notes: post.notes || 'No notes',
          recipientName: post.receiverId ? 'Recipient Assigned' : null,
        }))
      );
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Try to get the actual address using reverse geocoding
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            const address = data.display_name || '123 Green Street, Earth City';

            setDonationForm((prev) => ({
              ...prev,
              location: address,
              locationCoords: { lat: latitude, lng: longitude },
            }));
          } catch (error) {
            console.error('Error getting address from coordinates:', error);
            // Fallback to using coordinates as the address
            const fallbackAddress = `Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
            setDonationForm((prev) => ({
              ...prev,
              location: fallbackAddress,
              locationCoords: { lat: latitude, lng: longitude },
            }));
          }
        },
        (error) => {
          console.error('Error getting user location:', error);
          // Show error message to user
          setFormErrors((prev) => ({
            ...prev,
            location: 'Could not access your location. Please enter it manually.'
          }));
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setFormErrors((prev) => ({
        ...prev,
        location: 'Geolocation is not supported by your browser. Please enter your location manually.'
      }));
    }
  };

  const validateDonationForm = () => {
    const errors = {};
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Validate quantity
    if (!donationForm.quantity && !donationForm.estimatedQuantity) {
      errors.quantity = 'Quantity is required';
    }

    // Validate expiry date
    if (!donationForm.expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    } else if (donationForm.expiryDate < today) {
      errors.expiryDate = 'Expiry date cannot be in the past';
    }

    // Validate pickup time
    if (!donationForm.expiryTime) {
      errors.expiryTime = 'Pickup time is required';
    } else if (donationForm.expiryDate === today) {
      // If today, check if time is in the future
      const [hours, minutes] = donationForm.expiryTime.split(':').map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(hours, minutes, 0, 0);

      if (selectedTime < now) {
        errors.expiryTime = 'Pickup time must be in the future';
      }
    }

    // Validate location
    if (!donationForm.location) {
      errors.location = 'Location is required';
    } else if (!donationForm.locationCoords.lat || !donationForm.locationCoords.lng) {
      errors.location = 'Valid location coordinates are required';
    }

    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (authMode === 'login' || authMode === 'register') {
      setUserData((prev) => ({ ...prev, [name]: value }));
      setLocalAuthError('');
    } else {
      setDonationForm((prev) => ({ ...prev, [name]: value }));
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login with:', userData.email);
      await login(userData.email, userData.password);
      setUserData({ email: '', password: '', name: '', donorType: 'individual' });
    } catch (error) {
      console.error('Login error in component:', error);
      setLocalAuthError(error.message || 'Login failed');
    }
  };

  const validatePassword = (password) => {
    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Validate password before submitting
      const passwordError = validatePassword(userData.password);
      if (passwordError) {
        setLocalAuthError(passwordError);
        return;
      }

      console.log('Attempting registration with:', userData);
      const role = 'donor'; // Always set role to donor for simplicity
      await register({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role,
        phone: '1234567890', // Placeholder, add phone input if needed
      });
      setUserData({ email: '', password: '', name: '', donorType: 'individual' });
    } catch (error) {
      console.error('Registration error in component:', error);
      setLocalAuthError(error.message || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowMobileMenu(false);
    setDonationForm({
      quantity: '',
      estimatedQuantity: '',
      type: 'veg',
      perishable: 'perishable',
      expiryDate: '',
      expiryTime: '',
      location: '',
      locationCoords: { lat: null, lng: null },
      notes: '',
    });
    setDonations([]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Process the image file
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Simulate AI processing for quantity estimation
      setIsProcessingImage(true);
      setTimeout(() => {
        const mockEstimatedQuantity = `${Math.floor(Math.random() * 10) + 1} kgs`;
        setDonationForm((prev) => ({
          ...prev,
          estimatedQuantity: mockEstimatedQuantity,
        }));
        setIsProcessingImage(false);
      }, 1500);
    }
  };

  const handleSubmitDonation = async (e) => {
    e.preventDefault();
    const errors = validateDonationForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const expiryWindow = new Date(`${donationForm.expiryDate}T${donationForm.expiryTime}:00`);
      const formData = {
        quantity: parseFloat(donationForm.quantity || donationForm.estimatedQuantity.replace(/[^0-9.]/g, '')),
        foodType: donationForm.type,
        category: donationForm.perishable,
        expiryWindow,
        pickupDeadline: expiryWindow,
        imageUrl: imagePreview || null, // Replace with cloud storage URL later
        location: {
          coordinates: [donationForm.locationCoords.lng, donationForm.locationCoords.lat],
        },
        notes: donationForm.notes,
      };

      const response = await axios.post('http://localhost:5002/api/food-posts', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Get the newly created food post
      const newFoodPost = response.data;

      // Emit real-time event for new food post
      if (connected && socket) {
        socket.emit('new-food-post', {
          _id: newFoodPost._id,
          donorName: user.name,
          quantity: formData.quantity,
          foodType: formData.foodType,
          category: formData.category,
          expiryWindow: formData.expiryWindow,
          pickupDeadline: formData.pickupDeadline,
          imageUrl: formData.imageUrl,
          location: formData.location,
          notes: formData.notes
        });
      }

      toast.success('Donation posted successfully!');
      await fetchDonations();

      // Reset form
      setDonationForm({
        quantity: '',
        estimatedQuantity: '',
        type: 'veg',
        perishable: 'perishable',
        expiryDate: '',
        expiryTime: '',
        location: donationForm.location,
        locationCoords: donationForm.locationCoords,
        notes: '',
      });
      setImagePreview(null);
      setFormErrors({});
    } catch (error) {
      console.error('Error posting donation:', error);
      toast.error('Failed to post donation');
      setFormErrors({ submit: error.response?.data.message || 'Failed to post donation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'picked':
        return 'bg-purple-100 text-purple-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="mr-1" />;
      case 'accepted':
        return <Check size={16} className="mr-1" />;
      case 'picked':
        return <Truck size={16} className="mr-1" />;
      case 'verified':
        return <CheckCircle size={16} className="mr-1" />;
      default:
        return null;
    }
  };

  // Authentication Forms
  const renderAuthForm = () => {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className={`bg-white p-8 rounded-xl shadow-lg max-w-md w-full transform transition-all duration-500 ${authMode === 'login' ? 'animate-fadeIn' : 'animate-slideIn'}`}>
          <h2 className="text-2xl font-bold text-green-700 mb-6 text-center">
            {authMode === 'login' ? 'Welcome Back' : 'Join ZeroWaste'}
          </h2>
          {localAuthError && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">{localAuthError}</div>
          )}
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
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
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
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
                className={`w-full px-4 py-2 border ${userData.password && userData.password.length < 8 ? 'border-red-300' : 'border-gray-200'} rounded-md focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-colors duration-200`}
                required
                minLength="8"
              />
              {authMode === 'register' && (
                <div className="mt-1">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${userData.password.length < 8 ? 'bg-red-500' : userData.password.length < 12 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, (userData.password.length / 12) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-500">
                      {userData.password.length < 8 ? 'Weak' : userData.password.length < 12 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
                </div>
              )}
            </div>
            {authMode === 'register' && (
              <div>
                <label htmlFor="donorType" className="block text-sm font-medium text-gray-700 mb-1">
                  I am a
                </label>
                <select
                  name="donorType"
                  id="donorType"
                  value={userData.donorType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-colors duration-200"
                >
                  <option value="individual">Individual</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="organization">Organization</option>
                </select>
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

  // Donor Dashboard
  const renderDonorDashboard = () => {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-green-600 font-bold text-xl">ZeroWaste</span>
                </div>
              </div>
              <div className="hidden md:flex md:items-center md:space-x-4">
                <span className="text-gray-700 text-sm">Welcome, {user?.name || 'Donor'}</span>
                <button
                  onClick={handleLogout}
                  className="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 transform hover:scale-105 transition duration-200"
                  aria-label="Logout from ZeroWaste"
                >
                  <LogOut size={14} className="mr-1" /> Logout
                </button>
              </div>
              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
                  aria-label="Toggle mobile menu"
                >
                  <Menu size={24} />
                </button>
              </div>
            </div>
          </div>
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <div className="px-3 py-2 text-sm font-medium text-gray-700">
                  Welcome, {user?.name || 'Donor'}
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transform hover:scale-105 transition duration-200"
                  aria-label="Logout from ZeroWaste"
                >
                  <div className="flex items-center">
                    <LogOut size={14} className="mr-2" /> Logout
                  </div>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Main content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Post Donation Form */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Post Food Donation</h2>
              <form onSubmit={handleSubmitDonation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Image</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50">
                    <div className="space-y-1 text-center">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Food preview"
                            className="mx-auto h-32 w-auto object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setDonationForm((prev) => ({ ...prev, estimatedQuantity: '' }));
                            }}
                            className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transform hover:scale-110 transition duration-200"
                            aria-label="Remove uploaded image"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                            >
                              <span>Upload an image</span>
                              <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                  {isProcessingImage && (
                    <div className="mt-2 flex items-center justify-center text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-2"></div>
                      AI estimating quantity...
                    </div>
                  )}
                  {donationForm.estimatedQuantity && (
                    <div className="mt-2 flex items-center text-sm text-green-600">
                      <Check size={16} className="mr-1" />
                      AI estimated quantity:{' '}
                      <span className="font-medium ml-1">{donationForm.estimatedQuantity}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity {donationForm.estimatedQuantity && '(AI Estimated)'}
                  </label>
                  <input
                    type="text"
                    name="quantity"
                    id="quantity"
                    value={donationForm.quantity || donationForm.estimatedQuantity}
                    onChange={handleInputChange}
                    placeholder="e.g., 5 kgs, 10 packets"
                    className={`w-full px-3 py-2 border ${formErrors.quantity ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-green-500 focus:border-green-500`}
                  />
                  {formErrors.quantity && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.quantity}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Food Type
                    </label>
                    <select
                      name="type"
                      id="type"
                      value={donationForm.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="veg">Vegetarian</option>
                      <option value="non-veg">Non-Vegetarian</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="perishable" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="perishable"
                      id="perishable"
                      value={donationForm.perishable}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="perishable">Perishable</option>
                      <option value="non-perishable">Non-Perishable</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar size={16} className="text-gray-400" />
                      </div>
                      <input
                        type="date"
                        name="expiryDate"
                        id="expiryDate"
                        value={donationForm.expiryDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full pl-10 px-3 py-2 border ${formErrors.expiryDate ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-green-500 focus:border-green-500`}
                        required
                      />
                    </div>
                    {formErrors.expiryDate && (
                      <p className="mt-1 text-xs text-red-500">{formErrors.expiryDate}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="expiryTime" className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup By
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock size={16} className="text-gray-400" />
                      </div>
                      <input
                        type="time"
                        name="expiryTime"
                        id="expiryTime"
                        value={donationForm.expiryTime}
                        onChange={handleInputChange}
                        className={`w-full pl-10 px-3 py-2 border ${formErrors.expiryTime ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-green-500 focus:border-green-500`}
                        required
                      />
                    </div>
                    {formErrors.expiryTime && (
                      <p className="mt-1 text-xs text-red-500">{formErrors.expiryTime}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup Location
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="location"
                      id="location"
                      value={donationForm.location}
                      onChange={handleInputChange}
                      placeholder="Your address"
                      className={`w-full pl-10 px-3 py-2 border ${formErrors.location ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-green-500 focus:border-green-500`}
                      required
                    />
                  </div>
                  {formErrors.location && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.location}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 flex items-center">
                    <MapPin size={12} className="mr-1" />
                    Using your current location
                  </p>
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    id="notes"
                    rows="3"
                    value={donationForm.notes}
                    onChange={handleInputChange}
                    placeholder="Description of food, special instructions, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  ></textarea>
                </div>
                {formErrors.submit && (
                  <p className="text-xs text-red-500">{formErrors.submit}</p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-300 flex items-center justify-center transform hover:scale-105 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Post food donation"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Send size={16} className="mr-2" />
                  )}
                  Post Donation
                </button>
              </form>
            </div>

            {/* Donations Tracking */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Donations</h2>
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Food Details
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Deadline
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {donations.map((donation) => (
                        <tr key={donation.id} className="hover:bg-green-50 transition-colors duration-150">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12">
                                <img
                                  className="h-12 w-12 rounded-md object-cover"
                                  src={donation.image}
                                  alt="Food"
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{donation.quantity}</div>
                                <div className="text-xs text-gray-500">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${donation.type === 'veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {donation.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                                  </span>
                                  <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {donation.perishable === 'perishable' ? 'Perishable' : 'Non-Perishable'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center">
                              <Calendar size={14} className="mr-1 text-gray-500" />
                              {donation.expiryDate}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <Clock size={14} className="mr-1 text-gray-500" />
                              {donation.expiryTime}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${getStatusColor(donation.status)}`}>
                              {getStatusIcon(donation.status)}
                              {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                            </span>
                            {donation.recipientName && (
                              <div className="text-xs text-gray-500 mt-1">Recipient: {donation.recipientName}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-500 max-w-xs truncate">{donation.notes}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {donations.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="flex justify-center">
                      <UploadCloud className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No donations yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new donation.</p>
                  </div>
                )}
              </div>
              <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Donation Status Guide</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
                    <span className="flex items-center">
                      <Clock size={14} className="mr-1" /> Pending: Waiting for recipient
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
                    <span className="flex items-center">
                      <Check size={14} className="mr-1" /> Accepted: Recipient confirmed
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-purple-400 mr-2"></span>
                    <span className="flex items-center">
                      <Truck size={14} className="mr-1" /> Picked: Food picked up
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-400 mr-2"></span>
                    <span className="flex items-center">
                      <CheckCircle size={14} className="mr-1" /> Verified: Delivery confirmed
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-green-100 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-green-800">{donations.length}</div>
                  <div className="text-sm text-green-600">Total Donations</div>
                </div>
                <div className="bg-blue-100 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-blue-800">{donations.filter((d) => d.status === 'verified').length}</div>
                  <div className="text-sm text-blue-600">Completed</div>
                </div>
                <div className="bg-yellow-100 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-yellow-800">{donations.filter((d) => d.status === 'pending').length}</div>
                  <div className="text-sm text-yellow-600">Pending</div>
                </div>
                <div className="bg-purple-100 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-purple-800">
                    {donations.reduce((acc, donation) => {
                      const match = donation.quantity.match(/(\d+)/);
                      return acc + (match ? parseInt(match[0], 10) : 0);
                    }, 0)}
                  </div>
                  <div className="text-sm text-purple-600">Kgs Saved</div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm text-gray-500">
              © {new Date().getFullYear()} ZeroWaste. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col antialiased">
      {user && user.role === 'donor' ? renderDonorDashboard() : renderAuthForm()}
      {!user && (
        <div className="mt-8 text-center px-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-4">
            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            Zero Food Waste, Maximum Impact
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Turn Excess Food into Hope</h1>
          <p className="text-gray-600 mb-6">
            Join our community to donate excess food and help those in need. Our AI-powered platform
            connects donors with recipients in real-time.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div className="p-3 bg-white rounded-lg shadow-sm transform hover:scale-105 transition duration-200">
              <div className="text-green-600 font-semibold text-2xl">500+</div>
              <div className="text-gray-500 text-sm">Meals Shared</div>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm transform hover:scale-105 transition duration-200">
              <div className="text-green-600 font-semibold text-2xl">50+</div>
              <div className="text-gray-500 text-sm">Active Donors</div>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm transform hover:scale-105 transition duration-200">
              <div className="text-green-600 font-semibold text-2xl">200+</div>
              <div className="text-gray-500 text-sm">Kgs Saved</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorPanel;