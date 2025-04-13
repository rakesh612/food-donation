import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ErrorBoundary from './ErrorBoundary';
import FoodDonationMap from './FoodDonationMap';

// Get API URL from environment or use a function to determine it
const getApiUrl = () => {
  // First try environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Then try localStorage (for dynamic port)
  const savedApiUrl = localStorage.getItem('API_URL');
  if (savedApiUrl) {
    return savedApiUrl;
  }
  
  // Default to localhost with default port
  return 'http://localhost:5003/api';
};

const ReceiverPanel = () => {
  // Define all state variables at the top level
  const [state, setState] = useState({
    foodPosts: [],
    loading: false,
    error: null,
    userLocation: null,
    selectedFoodPost: null,
    showDirections: false,
    maxDistance: 10,
    apiUrl: getApiUrl()
  });

  // Destructure state for easier access
  const {
    foodPosts,
    loading,
    error,
    userLocation,
    selectedFoodPost,
    showDirections,
    maxDistance,
    apiUrl
  } = state;

  // Update state helper function
  const updateState = (updates) => {
    setState(prevState => ({
      ...prevState,
      ...updates
    }));
  };

  // Function to discover API URL if not available
  const discoverApiUrl = useCallback(async () => {
    // Try common ports
    const ports = [5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010, 5011];
    
    for (const port of ports) {
      try {
        const url = `http://localhost:${port}/api/health`;
        const response = await axios.get(url, { timeout: 1000 });
        if (response.status === 200) {
          const newApiUrl = `http://localhost:${port}/api`;
          updateState({ apiUrl: newApiUrl });
          localStorage.setItem('API_URL', newApiUrl);
          return newApiUrl;
        }
      } catch (err) {
        // Continue to next port
        console.log(`Port ${port} not available`);
      }
    }
    
    throw new Error('Could not find API server');
  }, []);

  // Memoize fetchNearbyFoodPosts to prevent recreation on each render
  const fetchNearbyFoodPosts = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      
      if (!userLocation) {
        throw new Error('User location is required');
      }

      let currentApiUrl = apiUrl;
      
      // If we don't have an API URL yet, try to discover it
      if (!currentApiUrl) {
        try {
          currentApiUrl = await discoverApiUrl();
        } catch (err) {
          throw new Error('Could not connect to API server. Please try again later.');
        }
      }

      const response = await axios.get(`${currentApiUrl}/food-posts/nearby`, {
        params: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          maxDistance
        }
      });

      updateState({ foodPosts: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching nearby food posts:', error);
      
      // If it's a connection error, try to discover a new API URL
      if (error.message.includes('Network Error') || error.code === 'ECONNREFUSED') {
        try {
          const newApiUrl = await discoverApiUrl();
          updateState({ 
            apiUrl: newApiUrl,
            error: 'Reconnected to API server. Please try again.',
            loading: false 
          });
        } catch (discoverError) {
          updateState({
            error: 'Could not connect to API server. Please try again later.',
            loading: false
          });
        }
      } else {
        updateState({
          error: error.response?.data?.message || 'Failed to fetch nearby food posts',
          loading: false
        });
      }
    }
  }, [userLocation, maxDistance, apiUrl, discoverApiUrl]);

  // Get user location on mount
  useEffect(() => {
    // Clear cached API URL to ensure we use the new port
    localStorage.removeItem('API_URL');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateState({
            userLocation: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          updateState({
            error: 'Unable to get your location. Please enable location services.'
          });
        }
      );
    } else {
      updateState({
        error: 'Geolocation is not supported by your browser'
      });
    }
  }, []);

  // Fetch food posts when location or maxDistance changes
  useEffect(() => {
    if (userLocation) {
      fetchNearbyFoodPosts();
    }
  }, [userLocation, maxDistance, fetchNearbyFoodPosts]);

  const handleSelectFoodPost = (post) => {
    updateState({
      selectedFoodPost: post,
      showDirections: true
    });
  };

  const handleMaxDistanceChange = (e) => {
    updateState({
      maxDistance: Number(e.target.value)
    });
  };

  const handleRetry = () => {
    fetchNearbyFoodPosts();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Available Food Donations</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Radius (km)
        </label>
        <input
          type="number"
          min="1"
          max="50"
          value={maxDistance}
          onChange={handleMaxDistanceChange}
          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={handleRetry}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <ErrorBoundary>
          <FoodDonationMap
            foodItems={foodPosts}
            onSelectItem={handleSelectFoodPost}
            userLocation={userLocation}
            initialSelectedForDirections={selectedFoodPost}
          />
        </ErrorBoundary>
      )}
      
      {selectedFoodPost && showDirections && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Directions to Food Donation</h2>
          {/* Add your directions component here */}
        </div>
      )}
    </div>
  );
};

export default ReceiverPanel; 