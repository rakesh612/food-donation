import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const statusColors = {
  fresh: "green",
  nearExpiry: "orange",
  expired: "gray",
};

// Sample mock data for now
const mockDonations = [
  {
    id: 1,
    name: "Fresh Veg Meals",
    lat: 17.385044,
    lng: 78.486671,
    status: "fresh",
    expiry: "2 hrs",
    type: "veg",
    quantity: "15 packs",
  },
  {
    id: 2,
    name: "Non-Veg Biryani",
    lat: 17.420044,
    lng: 78.466671,
    status: "nearExpiry",
    expiry: "45 min",
    type: "non-veg",
    quantity: "10 packs",
  },
  {
    id: 3,
    name: "Expired Sandwiches",
    lat: 17.405044,
    lng: 78.496671,
    status: "expired",
    expiry: "Expired",
    type: "veg",
    quantity: "5 packs",
  },
];

const GeoDashboard = () => {
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    // In production, fetch from your backend here
    setDonations(mockDonations);
  }, []);

  const getMarkerIcon = (status) =>
    L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color:${statusColors[status]}; width:16px; height:16px; border-radius:50%; border:2px solid white;"></div>`,
    });

  return (
    <div className="w-full h-screen p-4 bg-green-50">
      <h2 className="text-2xl font-bold text-green-800 mb-4">GeoMap Dashboard</h2>

      <div className="w-full h-[85vh] rounded-xl overflow-hidden shadow-lg border border-green-200">
        <MapContainer
          center={[17.385044, 78.486671]} // Center on Hyderabad for example
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {donations.map((donation) => (
            <Marker
              key={donation.id}
              position={[donation.lat, donation.lng]}
              icon={getMarkerIcon(donation.status)}
            >
              <Popup>
                <h3 className="font-bold text-lg">{donation.name}</h3>
                <p>
                  <strong>Status:</strong> {donation.status}
                </p>
                <p>
                  <strong>Expiry:</strong> {donation.expiry}
                </p>
                <p>
                  <strong>Type:</strong> {donation.type}
                </p>
                <p>
                  <strong>Quantity:</strong> {donation.quantity}
                </p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default GeoDashboard;
