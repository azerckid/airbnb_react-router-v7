import { redirect } from "react-router";
import bcrypt from "bcryptjs";
import { prisma } from "~/db.server";
import { commitSession, destroySession, getSession } from "./session.server";

// User session key
const USER_SESSION_KEY = "userId";

// Types for inputs
interface RegisterInput {
    username: string;
    email: string;
    password: string;
    name: string;
}

interface LoginInput {
    usernameOrEmail: string;
    password: string;
}

export async function register({
    username,
    email,
    password,
    name,
}: RegisterInput) {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ email }, { username }],
        },
    });

    if (existingUser) {
        return { error: "User with this email or username already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            username,
            name,
            password: hashedPassword,
            avatar: `https://ui-avatars.com/api/?name=${name || username}&background=random`,
        },
    });

    return { user };
}

export async function login({ usernameOrEmail, password }: LoginInput) {
    const user = await prisma.user.findFirst({
        where: {
            OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
        },
    });

    if (!user || !user.password) {
        return { error: "Invalid email/username or password" };
    }

    const isValidMatch = await bcrypt.compare(password, user.password);

    if (!isValidMatch) {
        return { error: "Invalid email/username or password" };
    }

    return { user };
}

// Create session and redirect
export async function createUserSession({
    request,
    userId,
    redirectTo,
}: {
    request: Request;
    userId: string;
    redirectTo: string;
}) {
    const session = await getSession(request.headers.get("Cookie"));
    session.set(USER_SESSION_KEY, userId);
    return redirect(redirectTo, {
        headers: {
            "Set-Cookie": await commitSession(session, {
                maxAge: 60 * 60 * 24 * 7, // 7 days
            }),
        },
    });
}

// Logout
export async function logout(request: Request, redirectTo: string = "/") {
    const session = await getSession(request.headers.get("Cookie"));
    return redirect(redirectTo, {
        headers: {
            "Set-Cookie": await destroySession(session),
        },
    });
}

// Get User ID from session
export async function getUserId(request: Request): Promise<string | undefined> {
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get(USER_SESSION_KEY);
    return userId;
}

// Get User from DB using session
export async function getUser(request: Request) {
    const userId = await getUserId(request);
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wishlists: true },
    });

    if (user) return user;

    throw await logout(request);
}

// Require Login (Guard)
export async function requireUser(request: Request) {
    const userId = await getUserId(request);
    if (!userId) {
        throw redirect("/login?redirectTo=" + new URL(request.url).pathname);
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (user) return user;

    throw await logout(request);
}

export async function getOptionalUser(request: Request) {
    const userId = await getUserId(request);
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (user) return user;
    return null;
}
