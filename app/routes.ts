import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("logout", "routes/logout.tsx"),
    route("rooms/new", "routes/rooms.new.tsx"),
    route("rooms/:roomId", "routes/rooms.$roomId.tsx"),
    route("trips", "routes/trips.tsx"),

    // Host Routes
    route("host/rooms", "routes/host.rooms.tsx"),
    route("host/bookings", "routes/host.bookings.tsx"),

    route("wishlists", "routes/wishlists.tsx"),
    route("api/wishlist", "routes/api.wishlist.tsx"),
    route("users/me", "routes/users.me.tsx"),


    // Admin Routes
    // Admin Routes
    route("admin", "routes/admin.tsx", [
        index("routes/admin._index.tsx"),
        route("users", "routes/admin.users.tsx"),
        route("rooms", "routes/admin.rooms.tsx"),
        route("bookings", "routes/admin.bookings.tsx"),
        route("amenities", "routes/admin.amenities.tsx"),
        route("categories", "routes/admin.categories.tsx"),
    ]),
] satisfies RouteConfig;
