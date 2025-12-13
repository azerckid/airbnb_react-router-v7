import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    index("routes/concierge.tsx", { id: "index" }),
    route("concierge", "routes/concierge.tsx", { id: "concierge" }),
    route("rooms", "routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("logout", "routes/logout.tsx"),
    route("rooms/new", "routes/rooms.new.tsx"),
    route("rooms/:roomId", "routes/rooms.$roomId.tsx"),
    route("trips", "routes/trips.tsx"),


    // Host Routes
    route("host/rooms", "routes/host/rooms.tsx"),
    route("host/bookings", "routes/host/bookings.tsx"),
    route("host/rooms/:roomId/photos", "routes/host/rooms.$roomId.photos.tsx"),


    route("wishlists", "routes/wishlists.tsx"),
    route("api/wishlist", "routes/api/wishlist.tsx"),

    route("messages", "routes/messages/route.tsx", [
        route(":id", "routes/messages/$id.tsx"),
    ]),
    route("api/conversations/create", "routes/api/conversations.create.tsx"),
    route("api/chat", "routes/api/chat.ts"),
    route("api/chat_history", "routes/api/chat_history.ts"),
    route("api/bookings/check", "routes/api/bookings.check.tsx"),

    route("experiences", "routes/experiences/_index.tsx"),
    route("experiences/:experienceId", "routes/experiences/$experienceId.tsx"),
    route("host/experiences/new", "routes/host/experiences.new.tsx"),

    route("users/me", "routes/users.me.tsx"),


    // Admin Routes
    // Admin Routes
    route("admin", "routes/admin/route.tsx", [
        index("routes/admin/_index.tsx"),
        route("users", "routes/admin/users.tsx"),
        route("rooms", "routes/admin/rooms.tsx"),
        route("bookings", "routes/admin/bookings.tsx"),
        route("amenities", "routes/admin/amenities.tsx"),
        route("categories", "routes/admin/categories.tsx"),
    ]),
] satisfies RouteConfig;
