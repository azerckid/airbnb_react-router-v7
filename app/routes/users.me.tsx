import type { Route } from "./+types/users.me";
import {
    Box,
    Button,
    Container,
    Heading,
    VStack,
    Input,
    Text,
    HStack,
    Avatar
} from "@chakra-ui/react";
import { Form, redirect, useNavigation } from "react-router";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import { toaster } from "~/components/ui/toaster";
import { useEffect } from "react";

export function meta() {
    return [{ title: "Edit Profile" }];
}

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    return { user };
}

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    // const avatar = formData.get("avatar") as string; // Optional if we add avatar input

    if (!name || !email) {
        return { error: "Name and Email are required" };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { name, email },
    });

    return { success: true };
}

export default function UserProfile({ loaderData, actionData }: Route.ComponentProps) {
    const { user } = loaderData;
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    useEffect(() => {
        if (actionData?.success) {
            toaster.create({
                title: "Profile Updated",
                type: "success",
                duration: 3000,
            });
        } else if (actionData?.error) {
            toaster.create({
                title: "Update Failed",
                description: actionData.error,
                type: "error",
                duration: 3000,
            });
        }
    }, [actionData]);

    return (
        <Container maxW="2xl" py={12}>
            <VStack gap={8} align="stretch">
                <Heading size="2xl">Edit Profile</Heading>

                <HStack gap={6} align="center">
                    <Avatar.Root size="2xl">
                        <Avatar.Image src={user.avatar || ""} />
                        <Avatar.Fallback name={user.name || "User"} />
                    </Avatar.Root>
                    <VStack align="flex-start" gap={1}>
                        <Text fontWeight="bold" fontSize="lg">Profile Photo</Text>
                        <Text fontSize="sm" color="fg.muted">To change your avatar, use Gravatar or update via generated URL logic (MVP limitation).</Text>
                    </VStack>
                </HStack>

                <Form method="post">
                    <VStack gap={4}>
                        <Box w="full">
                            <Text fontWeight="bold" mb={2}>Name</Text>
                            <Input name="name" defaultValue={user.name || ""} size="lg" />
                        </Box>

                        <Box w="full">
                            <Text fontWeight="bold" mb={2}>Email</Text>
                            <Input name="email" defaultValue={user.email} size="lg" type="email" />
                        </Box>

                        <Button
                            type="submit"
                            colorPalette="red"
                            size="lg"
                            w="full"
                            loading={isSubmitting}
                            mt={4}
                        >
                            Save Changes
                        </Button>
                    </VStack>
                </Form>
            </VStack>
        </Container>
    );
}
