import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("logout", "routes/logout.tsx"),
    route("rooms/:roomId", "routes/rooms.$roomId.tsx"),
    route("trips", "routes/trips.tsx"),
] satisfies RouteConfig;
