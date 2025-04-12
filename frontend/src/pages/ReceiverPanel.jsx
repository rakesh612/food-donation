import React, { useState, useEffect, useContext } from 'react';
import { MapPin, UserCheck, Users, User, Calendar, Search, Filter, CheckCircle, Star, Send } from "lucide-react";
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ReceiverPanel = () => {
  const { user } = useContext(AuthContext);
  const { connected, notifications, joinFoodPostRoom, updateFoodPostStatus } = useSocket();
  const [activeTab, setActiveTab] = useState("map");
  const [userType, setUserType] = useState("");
  const [isVerified, setIsVerified] = useState(user?.isVerified || false);
  const [foodItems, setFoodItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    maxDistance: 5,
    foodType: "all",
    freshness: "all"
  });
  const [requestedItems, setRequestedItems] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  // Fetch nearby food posts
  const fetchNearbyFoodPosts = async () => {
    try {
      if (user) {
        const token = localStorage.getItem('accessToken');
        // Get user's location
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;

          // Call API to get nearby food posts
          const response = await axios.get('http://localhost:5002/api/food-posts/nearby', {
            headers: { Authorization: `Bearer ${token}` },
            params: { latitude, longitude, maxDistance: filters.maxDistance * 1000 } // Convert miles to meters
          });

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
              donorId: post.donorId,
              imageUrl: post.imageUrl
            };
          });

          setFoodItems(posts);
        }, (error) => {
          console.error('Error getting location:', error);
          // Use mock data if location access is denied
          useMockData();
        });
      } else {
        // Use mock data for non-authenticated users
        useMockData();
      }
    } catch (error) {
      console.error('Error fetching food posts:', error);
      useMockData();
    }
  };

  // Fallback to mock data
  const useMockData = () => {
    setFoodItems([
      {
        id: 1,
        name: "Fresh Produce",
        location: "Downtown Community Center",
        distance: 0.8,
        distanceText: "0.8 miles",
        expires: "Tomorrow",
        expiryDays: 1,
        quantity: "15 boxes",
        type: "vegetables"
      },
      {
        id: 2,
        name: "Canned Goods",
        location: "North Food Bank",
        distance: 1.2,
        distanceText: "1.2 miles",
        expires: "Next week",
        expiryDays: 7,
        quantity: "30 units",
        type: "non-perishable"
      },
      {
        id: 3,
        name: "Baked Goods",
        location: "East Side Bakery",
        distance: 0.5,
        distanceText: "0.5 miles",
        expires: "Today",
        expiryDays: 0,
        quantity: "25 items",
        type: "grains"
      }
    ]);
  };

  // Fetch food posts on component mount and when filters change
  useEffect(() => {
    fetchNearbyFoodPosts();
  }, [user, filters.maxDistance]);

  // Handle real-time notifications
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latestNotification = notifications[0];

      if (!latestNotification.read && latestNotification.type === 'new-food-post') {
        toast.success('New food donation available nearby!');
        fetchNearbyFoodPosts(); // Refresh food items
      }
    }
  }, [notifications]);

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

  const filteredItems = foodItems.filter(item =>
    filterBySearch(item) &&
    filterByDistance(item) &&
    filterByFoodType(item) &&
    filterByFreshness(item)
  );

  const handleRequestItem = async (item) => {
    try {
      if (!user) {
        toast.error('Please login to request food');
        return;
      }

      const token = localStorage.getItem('accessToken');
      await axios.put(`http://localhost:5002/api/food-posts/accept/${item.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add to requested items locally
      setRequestedItems([...requestedItems, item.id]);

      // Join the food post room for real-time updates
      joinFoodPostRoom(item.id);

      toast.success(`Request sent for ${item.name}. You'll be notified when approved.`);

      // Refresh food items
      fetchNearbyFoodPosts();
    } catch (error) {
      console.error('Error requesting item:', error);
      toast.error(error.response?.data?.message || 'Failed to request food item');
    }
  };

  const handleConfirmReceipt = (item) => {
    setCurrentItem(item);
    setShowConfirmation(true);
  };

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
    { value: "vegetables", label: "Vegetables" },
    { value: "fruits", label: "Fruits" },
    { value: "dairy", label: "Dairy" },
    { value: "grains", label: "Grains & Bakery" },
    { value: "non-perishable", label: "Non-Perishable" },
    { value: "prepared", label: "Prepared Meals" }
  ];

  const freshnessOptions = [
    { value: "all", label: "All" },
    { value: "today", label: "Today Only" },
    { value: "tomorrow", label: "By Tomorrow" },
    { value: "thisWeek", label: "This Week" }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Food Receiver Portal</h1>
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
      </header>

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
        {!userType ? (
          <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-center">Register as a Food Receiver</h2>

            <div className="grid grid-cols-1 gap-4 mb-6">
              <button
                onClick={() => setUserType("ngo")}
                className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-500"
              >
                <Users className="mr-3 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold">Non-Governmental Organization (NGO)</p>
                  <p className="text-sm text-gray-500">For registered charities and organizations</p>
                </div>
              </button>

              <button
                onClick={() => setUserType("individual")}
                className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-500"
              >
                <User className="mr-3 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold">Individual</p>
                  <p className="text-sm text-gray-500">For individuals in need of food assistance</p>
                </div>
              </button>

              <button
                onClick={() => setUserType("volunteer")}
                className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-500"
              >
                <UserCheck className="mr-3 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold">Volunteer</p>
                  <p className="text-sm text-gray-500">For those looking to help with food distribution</p>
                </div>
              </button>
            </div>
          </div>
        ) : !isVerified ? (
          <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">Complete Registration</h2>

            <form onSubmit={(e) => { e.preventDefault(); setIsVerified(true); }}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Full Name / Organization Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  minLength="8"
                />
                <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
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
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
              >
                Submit for Verification
              </button>
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </div>
                </div>
              )}
            </div>

            {activeTab === "map" ? (
              <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin size={36} className="mx-auto mb-2 text-green-600" />
                    <p className="text-gray-600">Interactive Map</p>
                    <p className="text-sm text-gray-500">Shows food donation locations near you</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold text-lg">Nearest Food Locations</h3>
                  <div className="mt-3 space-y-3">
                    {filteredItems
                      .sort((a, b) => a.distance - b.distance)
                      .slice(0, 3)
                      .map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
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
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="font-semibold text-lg mb-4">Available Food Items</h3>

                <div className="space-y-4">
                  {filteredItems.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-medium text-green-600">{item.name}</h4>
                        <span className={`text-sm py-1 px-2 rounded ${
                          item.expiryDays === 0
                            ? 'bg-red-100 text-red-800'
                            : item.expiryDays <= 2
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          Expires: {item.expires}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span>{item.location}</span>
                        <span>{item.distanceText}</span>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-sm">{item.quantity} available</span>
                        {requestedItems.includes(item.id) ? (
                          <span className="text-sm text-green-600 flex items-center">
                            <CheckCircle size={16} className="mr-1" /> Request Sent
                          </span>
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
                  ))}
                  {filteredItems.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No results match your filters. Try adjusting your search.</p>
                  )}
                </div>
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
                          <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>{item.location}</span>
                            <span>{item.distanceText}</span>
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
    </div>
  );
};

export default ReceiverPanel;