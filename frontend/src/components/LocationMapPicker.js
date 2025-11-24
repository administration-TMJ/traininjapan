import React, { useState, useCallback, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const LocationMapPicker = ({ onLocationSelect, initialPosition, addressToGeocode }) => {
  const [markerPosition, setMarkerPosition] = useState(
    initialPosition || { lat: 35.6762, lng: 139.6503 } // Default to Tokyo
  );
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [lastGeocodedAddress, setLastGeocodedAddress] = useState('');

  // Forward geocode to get coordinates from address
  const forwardGeocode = useCallback(async (addressString) => {
    if (!addressString || addressString.trim() === '') return;
    
    setIsGeocodingAddress(true);
    setLastGeocodedAddress(addressString);
    
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ address: addressString });
      
      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        const formattedAddress = result.results[0].formatted_address;
        
        setMarkerPosition({ lat, lng });
        setAddress(formattedAddress);
        
        // Extract prefecture from address components
        let prefecture = '';
        let city = '';
        const addressComponents = result.results[0].address_components;
        for (const component of addressComponents) {
          if (component.types.includes('administrative_area_level_1')) {
            prefecture = component.long_name;
          }
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
        }
        
        if (onLocationSelect) {
          onLocationSelect({
            lat,
            lng,
            address: formattedAddress,
            prefecture,
            city,
            placeId: result.results[0].place_id
          });
        }
      }
    } catch (error) {
      console.error('Forward geocoding error:', error);
    } finally {
      setIsGeocodingAddress(false);
    }
  }, [onLocationSelect]);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = useCallback(async (lat, lng) => {
    setLoading(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({
        location: { lat, lng }
      });
      
      if (result.results[0]) {
        const formattedAddress = result.results[0].formatted_address;
        setAddress(formattedAddress);
        
        // Extract prefecture and city from address components
        let prefecture = '';
        let city = '';
        const addressComponents = result.results[0].address_components;
        for (const component of addressComponents) {
          if (component.types.includes('administrative_area_level_1')) {
            prefecture = component.long_name;
          }
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
        }
        
        if (onLocationSelect) {
          onLocationSelect({
            lat,
            lng,
            address: formattedAddress,
            prefecture,
            city,
            placeId: result.results[0].place_id
          });
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setAddress('Unable to get address');
    } finally {
      setLoading(false);
    }
  }, [onLocationSelect]);

  // Handle map click
  const handleMapClick = useCallback((e) => {
    if (e.detail && e.detail.latLng) {
      const { lat, lng } = e.detail.latLng;
      setMarkerPosition({ lat, lng });
      reverseGeocode(lat, lng);
    }
  }, [reverseGeocode]);

  // Initial geocoding
  useEffect(() => {
    if (markerPosition && window.google) {
      reverseGeocode(markerPosition.lat, markerPosition.lng);
    }
  }, []); // Only run once on mount

  // Geocode address when addressToGeocode prop changes
  useEffect(() => {
    // Only geocode if:
    // 1. addressToGeocode has a value
    // 2. Google Maps is loaded
    // 3. We're not currently geocoding
    // 4. The address is different from what we last geocoded
    if (addressToGeocode && 
        addressToGeocode.trim() !== '' &&
        window.google && 
        !isGeocodingAddress && 
        !loading &&
        addressToGeocode !== lastGeocodedAddress) {
      
      const timeoutId = setTimeout(() => {
        forwardGeocode(addressToGeocode);
      }, 1500); // Debounce 1.5 seconds
      
      return () => clearTimeout(timeoutId);
    }
  }, [addressToGeocode, isGeocodingAddress, loading, lastGeocodedAddress, forwardGeocode]);

  return (
    <div className="w-full">
      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-slate-700 mb-1">
          <strong>📍 Two ways to set location:</strong>
        </p>
        <p className="text-xs text-slate-600">
          • Type an address above and the map will update automatically<br />
          • Or click on the map to drop a pin and the address fields will be filled
        </p>
        {isGeocodingAddress && (
          <p className="text-xs text-blue-600 mt-2">🔄 Finding location on map...</p>
        )}
      </div>

      <div className="border border-slate-300 rounded-lg overflow-hidden shadow-sm">
        <Map
          style={{ width: '100%', height: '450px' }}
          defaultCenter={markerPosition}
          defaultZoom={15}
          onClick={handleMapClick}
          gestureHandling="greedy"
          mapId="location-picker-map"
        >
          <AdvancedMarker position={markerPosition}>
            <Pin background="#0f9d58" glyphColor="#fff" borderColor="#0a7d42" scale={1.2} />
          </AdvancedMarker>
        </Map>
      </div>

      {/* Display selected location info */}
      {address && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm font-medium text-slate-700 mb-2">Selected Location:</p>
          <p className="text-sm text-slate-600 mb-1">
            <strong>Address:</strong> {loading ? 'Loading...' : address}
          </p>
          <p className="text-xs text-slate-500">
            <strong>Coordinates:</strong> {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationMapPicker;
