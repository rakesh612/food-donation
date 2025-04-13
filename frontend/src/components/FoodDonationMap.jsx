import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import './leaflet.css';

// SearchControl component for searching locations
function SearchControl() {
  const map = useMap();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleLocationSelect = (location) => {
    map.setView([parseFloat(location.lat), parseFloat(location.lon)], 13);
    setShowResults(false);
    setSearchQuery(location.display_name);
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] w-64">
      <div className="relative">
        <div className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location..."
            className="w-full px-4 py-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700 flex items-center"
          >
            <MapPin className="w-4 h-4" />
          </button>
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleLocationSelect(result)}
              >
                {result.display_name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// RoutingControl component for directions
function RoutingControl({ from, to }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !from || !to) return;

    const routingControl = L.Routing.control({
      waypoints: [from, to],
      routeWhileDragging: true,
      showAlternatives: true,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#22c55e', weight: 4 }]
      }
    }).addTo(map);

    return () => {
      map.removeControl(routingControl);
    };
  }, [map, from, to]);

  return null;
}

const FoodDonationMap = ({ foodItems, onSelectItem, userLocation: propUserLocation, initialSelectedForDirections }) => {
  const [mapUserLocation, setMapUserLocation] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [selectedForDirections, setSelectedForDirections] = useState(initialSelectedForDirections);

  // Use the user location from props if available, otherwise get it from geolocation
  useEffect(() => {
    if (propUserLocation) {
      setMapUserLocation(new L.LatLng(propUserLocation.lat, propUserLocation.lng));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapUserLocation(new L.LatLng(position.coords.latitude, position.coords.longitude));
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to a central location in India if geolocation fails
          setMapUserLocation(new L.LatLng(20.5937, 78.9629));
        }
      );
    }
  }, [propUserLocation]);

  // Update directions when initialSelectedForDirections changes
  useEffect(() => {
    if (initialSelectedForDirections) {
      setSelectedForDirections(initialSelectedForDirections);
      setShowDirections(true);
    }
  }, [initialSelectedForDirections]);

  const getMarkerIcon = (status, type) => {
    // Color based on freshness/status
    const color = status === 'fresh' ? '#22c55e' :
                 status === 'expiring' ? '#eab308' :
                 status === 'accepted' ? '#3b82f6' :
                 status === 'picked' ? '#8b5cf6' :
                 '#ef4444';

    // Icon based on food type
    const icon = type === 'veg' ?
      // Vegetarian icon (leaf)
      `<path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8 c0-4.41,3.59-8,8-8s8,3.59,8,8C20,16.41,16.41,20,12,20z M16.17,8.76c-0.79-0.43-1.76-0.43-2.55,0L12,9.5l-1.62-0.74 c-0.79-0.43-1.76-0.43-2.55,0C7.05,9.15,6.55,10.1,6.55,11.1v2.79c0,1.01,0.5,1.95,1.28,2.34c0.79,0.43,1.76,0.43,2.55,0 L12,15.5l1.62,0.74c0.79,0.43,1.76,0.43,2.55,0c0.78-0.39,1.28-1.34,1.28-2.34V11.1C17.45,10.1,16.95,9.15,16.17,8.76z"/>` :
      // Non-vegetarian icon (drumstick)
      `<path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8 c0-4.41,3.59-8,8-8s8,3.59,8,8C20,16.41,16.41,20,12,20z M14.75,8.4c-0.57-0.38-1.28-0.38-1.85,0l-3.06,2.05 c-0.42,0.28-0.42,0.91,0,1.19l3.06,2.05c0.57,0.38,1.28,0.38,1.85,0l3.06-2.05c0.42-0.28,0.42-0.91,0-1.19L14.75,8.4z"/>`;

    return new Icon({
      iconUrl: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="36" height="36">
          <circle cx="12" cy="12" r="12" fill="${color}" opacity="0.8"/>
          <g fill="white" transform="scale(0.7) translate(5, 5)">${icon}</g>
        </svg>`
      )}`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
  };

  const handleGetDirections = (item) => {
    setSelectedForDirections(item);
    setShowDirections(true);
  };

  return (
    <div className="h-[500px] rounded-lg overflow-hidden relative">
      <MapContainer
        center={mapUserLocation ? [mapUserLocation.lat, mapUserLocation.lng] : [20.5937, 78.9629]}
        zoom={mapUserLocation ? 12 : 5} // Zoom in closer if we have user location
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <SearchControl />
        <ZoomControl position="bottomright" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {foodItems.map((item) => (
          <Marker
            key={item.id}
            position={[item.lat || 0, item.lng || 0]}
            icon={getMarkerIcon(
              item.status === 'accepted' ? 'accepted' :
              item.status === 'picked' ? 'picked' :
              item.expiryDays < 1 ? 'expired' :
              item.expiryDays < 2 ? 'expiring' : 'fresh',
              item.type
            )}
            eventHandlers={{
              click: () => onSelectItem(item.id)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.location}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">Quantity: {item.quantity}</p>
                  <p className="text-sm">Expires: {item.expires}</p>
                  <p className="text-sm">Type: {item.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}</p>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    onClick={() => onSelectItem(item.id)}
                  >
                    Request
                  </button>
                  <button
                    onClick={() => handleGetDirections(item)}
                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-4 h-4" />
                    Directions
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {showDirections && mapUserLocation && selectedForDirections && (
          <RoutingControl
            from={mapUserLocation}
            to={new L.LatLng(selectedForDirections.lat || 0, selectedForDirections.lng || 0)}
          />
        )}

        {/* Add a marker for the user's location */}
        {mapUserLocation && (
          <Marker
            position={[mapUserLocation.lat, mapUserLocation.lng]}
            icon={new Icon({
              iconUrl: `data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="36" height="36">
                  <circle cx="12" cy="12" r="12" fill="#3b82f6" opacity="0.8"/>
                  <circle cx="12" cy="12" r="6" fill="white"/>
                  <circle cx="12" cy="12" r="3" fill="#3b82f6"/>
                </svg>`
              )}`,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
              popupAnchor: [0, -18],
            })}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">Your Location</h3>
                <p className="text-sm text-gray-600 mt-1">This is your current location</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute bottom-4 right-4 z-[1000] bg-white p-2 rounded-lg shadow-md">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-600">Fresh & Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-600">Near Expiry</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-600">Accepted by You</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-xs text-gray-600">Picked Up</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-600">Expired</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodDonationMap;
