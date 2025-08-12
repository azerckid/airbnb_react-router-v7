import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("logout", "routes/logout.tsx"),
    route("rooms/:roomId", "routes/rooms.$roomId.tsx"),
    route("trips", "routes/trips.tsx"),

    // Admin Routes
    // Admin Routes
    route("admin", "routes/admin.tsx", [
        index("routes/admin._index.tsx"),
        route("users", "routes/admin.users.tsx"),
        route("rooms", "routes/admin.rooms.tsx"),
        route("bookings", "routes/admin.bookings.tsx"),
    ]),
] satisfies RouteConfig;
