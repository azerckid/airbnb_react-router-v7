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
import { FaUser, FaLock, FaEnvelope, FaIdCard } from "react-icons/fa";

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

export default function Signup() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Container maxW="lg" py={20}>
            <VStack gap={8} align="stretch">
                <VStack gap={2} textAlign="center">
                    <Heading size="3xl">Create an account</Heading>
                    <Text color="fg.muted">Join us today!</Text>
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

                            <Field.Root invalid={!!actionData?.errors?.name}>
                                <Field.Label>Full Name</Field.Label>
                                <Stack direction="row" alignItems="center" bg="gray.50" _dark={{ bg: "gray.800" }} px={3} borderRadius="md" borderWidth="1px">
                                    <FaIdCard color="gray" />
                                    <Input
                                        variant="subtle"
                                        border="none"
                                        _focus={{ ring: 0 }}
                                        name="name"
                                        placeholder="John Doe"
                                    />
                                </Stack>
                                {actionData?.errors?.name && (
                                    <Field.ErrorText>{actionData.errors.name[0]}</Field.ErrorText>
                                )}
                            </Field.Root>

                            <Field.Root invalid={!!actionData?.errors?.username}>
                                <Field.Label>Username</Field.Label>
                                <Stack direction="row" alignItems="center" bg="gray.50" _dark={{ bg: "gray.800" }} px={3} borderRadius="md" borderWidth="1px">
                                    <FaUser color="gray" />
                                    <Input
                                        variant="subtle"
                                        border="none"
                                        _focus={{ ring: 0 }}
                                        name="username"
                                        placeholder="johndoe"
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
                                        placeholder="hello@airbnb.com"
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
