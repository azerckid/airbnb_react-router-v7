import {
    Form,
    Link as RouterLink,
    redirect,
    useActionData,
    useNavigation,
} from "react-router";
import {
    Box,
    Button,
    Container,
    Heading,
    Input,
    Text,
    VStack,
    Stack,
    Field,
} from "@chakra-ui/react";
import { loginSchema } from "~/validations";
import { createUserSession, login, getUserId } from "~/services/auth.server";
import type { Route } from "./+types/login";
import { z } from "zod";
import { FaUser, FaLock } from "react-icons/fa";

export async function loader({ request }: Route.LoaderArgs) {
    const userId = await getUserId(request);
    if (userId) return redirect("/");
    return null;
}

export async function action({ request }: Route.ActionArgs) {
    const formData = await request.formData();
    const usernameOrEmail = formData.get("usernameOrEmail") as string;
    const password = formData.get("password") as string;
    const redirectTo =
        new URL(request.url).searchParams.get("redirectTo") || "/";

    // Validate form
    const result = loginSchema.safeParse({ usernameOrEmail, password });

    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        return { errors };
    }

    // Attempt login
    const { user, error } = await login({ usernameOrEmail, password });

    if (error || !user) { // user check is for typescript narrowing
        return { formError: error || "Something went wrong" };
    }

    return createUserSession({
        request,
        userId: user.id,
        redirectTo,
    });
}

export default function Login() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Container maxW="lg" py={20}>
            <VStack gap={8} align="stretch">
                <VStack gap={2} textAlign="center">
                    <Heading size="3xl">Welcome back</Heading>
                    <Text color="fg.muted">Login to your account</Text>
                </VStack>

                <Box
                    bg="bg.panel"
                    p={8}
                    borderRadius="xl"
                    borderWidth="1px"
                    boxShadow="sm"
                >
                    <Form method="post">
                        <VStack gap={6}>
                            {actionData?.formError && (
                                <Box
                                    w="full"
                                    p={3}
                                    bg="red.50"
                                    color="red.600"
                                    borderRadius="md"
                                    fontSize="sm"
                                    fontWeight="medium"
                                >
                                    {actionData.formError}
                                </Box>
                            )}

                            <Field.Root invalid={!!actionData?.errors?.usernameOrEmail}>
                                <Field.Label>Email or Username</Field.Label>
                                <Stack direction="row" alignItems="center" bg="gray.50" _dark={{ bg: "gray.800" }} px={3} borderRadius="md" borderWidth="1px">
                                    <FaUser color="gray" />
                                    <Input
                                        variant="subtle"
                                        border="none"
                                        _focus={{ ring: 0 }}
                                        name="usernameOrEmail"
                                        type="text"
                                        placeholder="Email or Username"
                                    />
                                </Stack>
                                {actionData?.errors?.usernameOrEmail && (
                                    <Field.ErrorText>{actionData.errors.usernameOrEmail[0]}</Field.ErrorText>
                                )}
                            </Field.Root>

                            <Field.Root invalid={!!actionData?.errors?.password}>
                                <Field.Label>Password</Field.Label>
                                <Stack direction="row" alignItems="center" bg="gray.50" _dark={{ bg: "gray.800" }} px={3} borderRadius="md" borderWidth="1px">
                                    <FaLock color="gray" />
                                    <Input
                                        variant="subtle"
                                        border="none"
                                        _focus={{ ring: 0 }}
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                    />
                                </Stack>
                                {actionData?.errors?.password && (
                                    <Field.ErrorText>
                                        {actionData.errors.password[0]}
                                    </Field.ErrorText>
                                )}
                            </Field.Root>

                            <Button
                                type="submit"
                                colorPalette="red"
                                size="lg"
                                width="full"
                                loading={isSubmitting}
                            >
                                Log in
                            </Button>
                        </VStack>
                    </Form>
                </Box>

                <Text textAlign="center" fontSize="sm">
                    Don't have an account?{" "}
                    <RouterLink to="/signup">
                        <Text as="span" color="red.500" fontWeight="medium">
                            Sign up
                        </Text>
                    </RouterLink>
                </Text>
            </VStack>
        </Container>
    );
}
