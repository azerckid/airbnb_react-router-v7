import type { Route } from "./+types/host.experiences.new";
import {
    Box,
    Container,
    Heading,
    VStack,
    Input,
    Textarea,
    Button,
    Select,
    HStack,
    Text
} from "@chakra-ui/react";
import { Form, redirect, useNavigation } from "react-router";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
    await requireUser(request);
    const categories = await prisma.category.findMany();
    return { categories };
}

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const price = Number(formData.get("price"));
    const city = formData.get("city") as string;
    const country = formData.get("country") as string;
    const categoryId = formData.get("categoryId") as string;
    const startedAt = formData.get("startedAt") as string;
    const endTime = formData.get("endTime") as string;
    const address = formData.get("address") as string;

    if (!title || !description || !price || !city || !country || !categoryId) {
        return { error: "Missing required fields" };
    }

    const experience = await prisma.experience.create({
        data: {
            title,
            description,
            price,
            city,
            country,
            categoryId,
            hostId: user.id,
            startedAt,
            endTime,
            address,
            // Default placeholder photo until we implement upload flow for experiences
        }
    });

    return redirect(`/experiences/${experience.id}`);
}

export default function NewExperience({ loaderData }: Route.ComponentProps) {
    const { categories } = loaderData;
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Container maxW="2xl" py={12}>
            <VStack align="stretch" gap={8}>
                <Heading size="2xl">Host an Experience</Heading>

                <Form method="post">
                    <VStack gap={5} align="stretch">
                        <Box>
                            <Text mb={2} fontWeight="medium">Category</Text>
                            <select name="categoryId" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} required>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Box>

                        <Box>
                            <Text mb={2} fontWeight="medium">Title</Text>
                            <Input name="title" placeholder="e.g. Pasta Making with Nonna" required />
                        </Box>

                        <HStack>
                            <Box flex={1}>
                                <Text mb={2} fontWeight="medium">City</Text>
                                <Input name="city" placeholder="e.g. Rome" required />
                            </Box>
                            <Box flex={1}>
                                <Text mb={2} fontWeight="medium">Country</Text>
                                <Input name="country" placeholder="e.g. Italy" required />
                            </Box>
                        </HStack>

                        <Box>
                            <Text mb={2} fontWeight="medium">Description</Text>
                            <Textarea name="description" placeholder="Describe what you'll be doing..." rows={5} required />
                        </Box>

                        <HStack>
                            <Box flex={1}>
                                <Text mb={2} fontWeight="medium">Price ($)</Text>
                                <Input name="price" type="number" min={0} placeholder="50" required />
                            </Box>
                            <Box flex={1}>
                                <Text mb={2} fontWeight="medium">Duration</Text>
                                <Input name="endTime" placeholder="e.g. 2 hours, 1 day" />
                            </Box>
                        </HStack>

                        <Box>
                            <Text mb={2} fontWeight="medium">Start Time</Text>
                            <Input name="startedAt" placeholder="e.g. 10:00 AM" />
                        </Box>

                        <Box>
                            <Text mb={2} fontWeight="medium">Meeting Address</Text>
                            <Input name="address" placeholder="123 Main St..." />
                        </Box>

                        <Button type="submit" size="lg" colorPalette="red" loading={isSubmitting} mt={4}>
                            Create Experience
                        </Button>
                    </VStack>
                </Form>
            </VStack>
        </Container>
    );
}
