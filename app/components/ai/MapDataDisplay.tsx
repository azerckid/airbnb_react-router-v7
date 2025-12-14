import React, { Suspense, useEffect, useState } from 'react';

// Define the props interface here as well to maintain type safety for consumers
interface MapCoordinate {
    lat: number;
    lng: number;
    name: string;
    price?: string;
}

interface MapDataDisplayProps {
    origin: MapCoordinate;
    destinations: MapCoordinate[];
    className?: string;
}

// Lazy load the actual map component
// The .client extension and lazy import ensures this code is not evaluated on the server
// We handle the named export 'MapDataDisplay' by mapping it to 'default' for React.lazy
const MapClient = React.lazy(() =>
    import('./Map.client').then(module => ({ default: module.MapDataDisplay }))
);

export function MapDataDisplay(props: MapDataDisplayProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <div className={`h-[400px] w-full bg-gray-100 animate-pulse rounded-xl border border-gray-200 ${props.className || ''}`} />
        );
    }

    return (
        <Suspense fallback={<div className={`h-[400px] w-full bg-gray-100 animate-pulse rounded-xl border border-gray-200 ${props.className || ''}`} />}>
            <MapClient {...props} />
        </Suspense>
    );
}
