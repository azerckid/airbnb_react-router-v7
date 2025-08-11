import { createCookieSessionStorage } from "react-router";

// Export the whole sessionStorage object
export const sessionStorage = createCookieSessionStorage({
    cookie: {
        name: "__session", // use any name you want here
        httpOnly: true, // for security, read-only from the server
        path: "/", // available for the entire app
        sameSite: "lax", // csrf protection
        secrets: [process.env.SESSION_SECRET || "s3cr3t"], // replace this with an actual secret
        secure: process.env.NODE_ENV === "production", // enable this in prod only
    },
});

// You can also export the methods individually for your own usage
export const { getSession, commitSession, destroySession } = sessionStorage;
