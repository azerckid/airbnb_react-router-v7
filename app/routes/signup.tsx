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
import { registerSchema } from "~/validations";
import { createUserSession, register, getUserId } from "~/services/auth.server";
import type { Route } from "./+types/signup";
import { FaUser, FaLock, FaEnvelope, FaIdCard, FaUserNinja } from "react-icons/fa";

export async function loader({ request }: Route.LoaderArgs) {
    const userId = await getUserId(request);
    if (userId) return redirect("/");
    return null;
}

export async function action({ request }: Route.ActionArgs) {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validate form
    const result = registerSchema.safeParse({
        email,
        username,
        name,
        password,
        confirmPassword,
    });

    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        return { errors };
    }

    // Attempt register
    const { user, error } = await register({ email, username, name, password });

    if (error || !user) {
        return { formError: error || "Something went wrong" };
    }

    return createUserSession({
        request,
        userId: user.id,
        redirectTo: "/",
    });
}

import { toaster } from "~/components/ui/toaster";
import { useEffect } from "react";

// clientAction removed in favor of useEffect for reliability


export default function Signup() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    useEffect(() => {
        if (actionData?.errors) {
            toaster.create({
                title: "Signup Failed",
                description: "Please check your input.",
                type: "error",
                duration: 5000,
            });
        }
        if (actionData?.formError) {
            toaster.create({
                title: "Signup Failed",
                description: actionData.formError,
                type: "error",
                duration: 5000,
            });
        }
    }, [actionData]);

    return (
        <Container maxW="lg" py={20}>
            <VStack gap={8} align="stretch">
                <VStack gap={2} textAlign="center">
                    <Heading size="3xl">Create an account</Heading>
                    <Text color="fg.muted">Join our community today</Text>
                </VStack>

                <Box
                    bg="bg.panel"
                    p={8}
                    borderRadius="xl"
                    borderWidth="1px"
                    boxShadow="sm"
                >
                    <Form method="post">
                        <VStack gap={5}>
                            {/* Inline error removed, handled by Toast */}

                            <Field.Root invalid={!!actionData?.errors?.name}>
                                <Field.Label>Full Name</Field.Label>
                                <Stack direction="row" alignItems="center" bg="gray.50" _dark={{ bg: "gray.800" }} px={3} borderRadius="md" borderWidth="1px">
                                    <FaIdCard color="gray" />
                                    <Input
                                        variant="subtle"
                                        border="none"
                                        _focus={{ ring: 0 }}
                                        name="name"
                                        type="text"
                                        placeholder="Name"
                                    />
                                </Stack>
                                {actionData?.errors?.name && (
                                    <Field.ErrorText>{actionData.errors.name[0]}</Field.ErrorText>
                                )}
                            </Field.Root>

                            <Field.Root invalid={!!actionData?.errors?.username}>
                                <Field.Label>Username</Field.Label>
                                <Stack direction="row" alignItems="center" bg="gray.50" _dark={{ bg: "gray.800" }} px={3} borderRadius="md" borderWidth="1px">
                                    <FaUserNinja color="gray" />
                                    <Input
                                        variant="subtle"
                                        border="none"
                                        _focus={{ ring: 0 }}
                                        name="username"
                                        type="text"
                                        placeholder="Username"
                                    />
                                </Stack>
                                {actionData?.errors?.username && (
                                    <Field.ErrorText>{actionData.errors.username[0]}</Field.ErrorText>
                                )}
                            </Field.Root>

                            <Field.Root invalid={!!actionData?.errors?.email}>
                                <Field.Label>Email</Field.Label>
                                <Stack direction="row" alignItems="center" bg="gray.50" _dark={{ bg: "gray.800" }} px={3} borderRadius="md" borderWidth="1px">
                                    <FaEnvelope color="gray" />
                                    <Input
                                        variant="subtle"
                                        border="none"
                                        _focus={{ ring: 0 }}
                                        name="email"
                                        type="email"
                                        placeholder="Email"
                                    />
                                </Stack>
                                {actionData?.errors?.email && (
                                    <Field.ErrorText>{actionData.errors.email[0]}</Field.ErrorText>
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

                            <Field.Root invalid={!!actionData?.errors?.confirmPassword}>
                                <Field.Label>Confirm Password</Field.Label>
                                <Stack direction="row" alignItems="center" bg="gray.50" _dark={{ bg: "gray.800" }} px={3} borderRadius="md" borderWidth="1px">
                                    <FaLock color="gray" />
                                    <Input
                                        variant="subtle"
                                        border="none"
                                        _focus={{ ring: 0 }}
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                    />
                                </Stack>
                                {actionData?.errors?.confirmPassword && (
                                    <Field.ErrorText>
                                        {actionData.errors.confirmPassword[0]}
                                    </Field.ErrorText>
                                )}
                            </Field.Root>

                            <Button
                                type="submit"
                                colorPalette="red"
                                size="lg"
                                width="full"
                                loading={isSubmitting}
                                mt={2}
                            >
                                Sign up
                            </Button>
                        </VStack>
                    </Form>
                </Box>

                <Text textAlign="center" fontSize="sm">
                    Already have an account?{" "}
                    <RouterLink to="/login">
                        <Text as="span" color="red.500" fontWeight="medium">
                            Log in
                        </Text>
                    </RouterLink>
                </Text>
            </VStack>
        </Container>
    );
}
