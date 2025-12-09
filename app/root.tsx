import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useSearchParams,
} from "react-router";
import { useEffect } from "react";

import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";

import { Provider } from "./components/ui/provider";
import { Toaster, toaster } from "./components/ui/toaster";
import { Navigation } from "./components/common/Navigation";
import { Footer } from "./components/common/Footer";
import { getUser } from "./services/auth.server";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  return { user };
}



export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Provider defaultTheme="light" forcedTheme="light">
          {children}
          <ScrollRestoration />
          <Scripts />

        </Provider>
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const toastType = searchParams.get("toast");

    if (toastType === "logged_out") {
      toaster.create({
        title: "Logged out",
        description: "See you next time!",
        type: "success",
        duration: 3000,
      });
    } else if (toastType === "login_success") {
      toaster.create({
        title: "Welcome back!",
        description: "You have successfully logged in.",
        type: "success",
        duration: 3000,
      });
    }

    // Clear the query param if any relevant toast was found
    if (toastType) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("toast");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <>
      <Navigation user={loaderData.user} isLoggedIn={!!loaderData.user} />
      <Outlet context={{ user: loaderData.user }} />
      <Footer />
      <Toaster />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
