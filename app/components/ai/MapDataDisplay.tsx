
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import React, { useEffect } from 'react';

// Fix for default Leaflet icon issues in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapCoordinate {
    lat: number;
    lng: number;
    name: string;
    price?: string; // Optional price string for destination
}

interface MapDataDisplayProps {
    origin: MapCoordinate;
    destinations: MapCoordinate[];
    className?: string;
}

// Helper to fit bounds
function FitBounds({ markers }: { markers: MapCoordinate[] }) {
    const map = useMap();

    useEffect(() => {
        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, markers]);

    return null;
}

export function MapDataDisplay({ origin, destinations, className }: MapDataDisplayProps) {
    // Collect all points for bounds (origin + all destinations)
    const allMarkers = [origin, ...destinations];

    return (
        <div className={`h-[300px] w-full rounded-lg overflow-hidden shadow-sm border border-gray-200 z-0 ${className}`}>
            <MapContainer
                center={[origin.lat, origin.lng]}
                zoom={5}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Origin Marker */}
                <Marker position={[origin.lat, origin.lng]}>
                    <Popup>
                        <strong>🛫 출발: {origin.name}</strong>
                    </Popup>
                </Marker>

                {/* Destination Markers & Lines */}
                {destinations.map((dest, idx) => (
                    <React.Fragment key={idx}>
                        <Marker position={[dest.lat, dest.lng]}>
                            <Popup>
                                <strong>🛬 도착: {dest.name}</strong>
                                {dest.price && <br />}
                                {dest.price && <span className="text-sm text-green-600 font-semibold">{dest.price}</span>}
                            </Popup>
                        </Marker>

                        {/* Line from Origin to Destination */}
                        <Polyline
                            positions={[
                                [origin.lat, origin.lng],
                                [dest.lat, dest.lng]
                            ]}
                            pathOptions={{
                                color: '#3b82f6', // Tailwind blue-500
                                weight: 3,
                                opacity: 0.7,
                                dashArray: '5, 10'
                            }}
                        />
                    </React.Fragment>
                ))}

                <FitBounds markers={allMarkers} />
            </MapContainer>
        </div>
    );
}
