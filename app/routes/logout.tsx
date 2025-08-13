import { redirect } from "react-router";
import { logout } from "~/services/auth.server";
import type { Route } from "./+types/logout";
export async function action({ request }: Route.ActionArgs) {
    return logout(request, "/?toast=logged_out");
}

export async function loader() {
    return redirect("/");
}
