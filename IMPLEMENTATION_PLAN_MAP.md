
# Implementation Plan: AI Concierge Map Visualization (Leaflet)

This plan outlines the steps to integrate an interactive map into the AI Concierge interface, allowing users to visualize travel routes (origin to destination) suggested by the AI. We will use **Leaflet** with OpenStreetMap for a free, no-API-key solution.

## Step 1: Install Dependencies
- Install `leaflet` and `react-leaflet` packages.
- Install `@types/leaflet` for TypeScript support.
- **Goal**: Ensure necessary libraries are available for map rendering.

## Step 2: Create Reusable Map Component (`MapDataDisplay.tsx`)
- Create `app/components/ai/MapDataDisplay.tsx`.
- Implement a React component that accepts `origin` and `destination` coordinates (lat/lng).
- Use `<MapContainer>`, `<TileLayer>`, `<Marker>`, and `<Polyline>` to render the map, markers, and flight path.
- **Goal**: A standalone component responsible for rendering the map visualization.

## Step 3: Define Map Data Structure
- Update `app/services/ai/nodes/types.ts` (AgentState).
- Add a `mapData` field to the `AgentState` and the return type of the AI response logic.
- Structure: `{ origin: { lat, lng, name }, destinations: Array<{ lat, lng, name, price? }> }`.
- **Goal**: Standardize how map data is passed from the backend (AI) to the frontend.

## Step 4: Add Coordinates to Airport/City Data
- Update `app/services/ai/tools/korean-airports.ts` and `destination-mapping.ts`.
- Add exact `latitude` and `longitude` fields to each airport/city entry.
- **Goal**: Ensure the AI has access to the geospatial data needed for the map.

## Step 5: Update `finalizeAutoPlanNode` Logic
- Modify `app/services/ai/nodes/auto-plan.ts`.
- In the final step, extract the coordinates of the selected origin and the recommended details.
- Construct the `mapData` object and include it in the returned state/response.
- **Goal**: Have the AI generate the map data dynamically based on the search results.

## Step 6: Update AI Response Streaming
- Modify `app/services/ai/graph.server.ts` (specifically `generateGraphResponse`).
- Ensure that the custom `mapData` event/field is properly encoded and streamed to the client (e.g., as a special event type or part of the final JSON chunk).
- **Goal**: Transmit the map data from server to client via the existing streaming connection.

## Step 7: Update Frontend Chat Interface (`concierge.tsx`)
- Modify `app/routes/concierge.tsx`.
- Update the message handling logic to parse the incoming `mapData`.
- Use the new `MapDataDisplay` component to render the map when `mapData` is present in the message history.
- **Goal**: Display the map in the chat UI.

## Step 8: Style the Map Component
- Update `app/app.css` or use Tailwind classes.
- Ensure the map container has a defined height (critical for Leaflet) and responsive width.
- Fix any z-index issues (Leaflet often overlaps with other UI elements).
- **Goal**: Ensure the map looks good and fits within the chat bubble or sidebar.

## Step 9: Testing & Verification
- Run a "Auto Plan" request (e.g., "Recommend a trip").
- Verify that the map appears at the end of the recommendation.
- Check if markers are in correct locations (Korea -> Japan).
- **Goal**: Confirm functional correctness.

## Step 10: Polish & Refinement
- Add custom icons for airports/hotels if time permits.
- Adjust zoom levels to automatically fit all markers (bounds).
- **Goal**: Enhance user experience.
