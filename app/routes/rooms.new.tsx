import {
    Box,
    Button,
    Container,
    Heading,
    VStack,
    Text,
    Input,
    Textarea,
    HStack,
    SimpleGrid,
    Icon,
} from "@chakra-ui/react";
import { Form, useActionData, useLoaderData, useNavigation, redirect, useNavigate } from "react-router";
import { useState } from "react";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { FaHome, FaDollarSign, FaBed, FaMapMarkerAlt, FaImage } from "react-icons/fa";
import { toaster } from "~/components/ui/toaster";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireUser(request);
    if (!user.isHost) throw redirect("/");

    const categories = await prisma.category.findMany();
    const amenities = await prisma.amenity.findMany();

    return { categories, amenities };
}

export async function action({ request }: ActionFunctionArgs) {
    const user = await requireUser(request);
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const price = parseInt(formData.get("price") as string);
    const categoryId = formData.get("categoryId") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const country = formData.get("country") as string;
    const photo = formData.get("photo") as string;
    const amenityIds = formData.getAll("amenities") as string[];

    // Basic validation
    if (!title || !description || !price || !categoryId || !address) {
        return { error: "Missing required fields" };
    }

    try {
        const room = await prisma.room.create({
            data: {
                title,
                description,
                price,
                address,
                city,
                country,
                photo,
                ownerId: user.id,
                categoryId,
                amenities: {
                    connect: amenityIds.map((id) => ({ id })),
                },
            },
        });

        // Trigger AI updates (non-blocking)
        import("~/services/ai/core.server").then(({ updateVectorStore }) => {
            updateVectorStore(room.id).catch(console.error);
        });

        return redirect(`/rooms/${room.id}`);
    } catch (e) {
        console.error(e);
        return { error: "Failed to create room" };
    }
}

// Fallback type since we aren't using generated types
interface LoaderData {
    categories: any[];
    amenities: any[];
}

export default function NewRoom({ loaderData, actionData }: { loaderData: LoaderData, actionData: any }) {
    const { categories, amenities } = loaderData;
    const navigation = useNavigation();
    const navigate = useNavigate();
    const isSubmitting = navigation.state === "submitting";

    const [step, setStep] = useState(1);
    const totalSteps = 4;

    // Form State
    const [formData, setFormData] = useState({
        categoryId: "",
        title: "",
        description: "",
        price: "",
        address: "",
        city: "",
        country: "",
        photo: "",
        amenities: [] as string[],
    });

    const updateField = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const toggleAmenity = (id: string) => {
        setFormData((prev) => {
            const exists = prev.amenities.includes(id);
            return {
                ...prev,
                amenities: exists
                    ? prev.amenities.filter((a) => a !== id)
                    : [...prev.amenities, id],
            };
        });
    };

    const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    // Determine if next is disabled
    const isNextDisabled = () => {
        if (step === 1) return !formData.categoryId;
        if (step === 2) return !formData.title || !formData.description || !formData.price;
        if (step === 3) return !formData.address || !formData.city || !formData.country;
        return false;
    };

    return (
        <Container maxW="3xl" py={12}>
            {/* Progress Bar */}
            <Box mb={8} bg="gray.100" h="2" borderRadius="full">
                <Box
                    bg="red.500"
                    h="100%"
                    w={`${(step / totalSteps) * 100}%`}
                    borderRadius="full"
                    transition="width 0.3s"
                />
            </Box>

            <Form
                method="post"
                id="room-form"
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        // If textarea, allow new lines
                        if (e.target instanceof HTMLTextAreaElement) return;

                        // Prevent default submission
                        e.preventDefault();

                        // If next is logically allowed, go to next step
                        if (step < totalSteps && !isNextDisabled()) {
                            nextStep();
                        }
                    }
                }}
            >
                <VStack gap={8} align="stretch">

                    {/* STEP 1: Category */}
                    {step === 1 && (
                        <Box>
                            <Heading mb={6}>Which of these best describes your place?</Heading>
                            <SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
                                {categories.map((cat: any) => (
                                    <Box
                                        key={cat.id}
                                        borderWidth="2px"
                                        borderColor={formData.categoryId === cat.id ? "black" : "gray.200"}
                                        borderRadius="xl"
                                        p={4}
                                        cursor="pointer"
                                        _hover={{ borderColor: "black" }}
                                        onClick={() => updateField("categoryId", cat.id)}
                                        bg={formData.categoryId === cat.id ? "gray.50" : "white"}
                                    >
                                        <VStack>
                                            {/* Placeholder for icon if we had a library or image */}
                                            <Text fontSize="2xl">🏠</Text>
                                            <Text fontWeight="semibold">{cat.name}</Text>
                                        </VStack>
                                    </Box>
                                ))}
                            </SimpleGrid>
                            <input type="hidden" name="categoryId" value={formData.categoryId} />
                        </Box>
                    )}

                    {/* STEP 2: Basic Info */}
                    {step === 2 && (
                        <VStack gap={6} align="stretch">
                            <Heading>Let's give your place a name and description</Heading>
                            <Box>
                                <Text fontWeight="bold" mb={2}>Title</Text>
                                <Input
                                    name="title"
                                    value={formData.title}
                                    onChange={(e) => updateField("title", e.target.value)}
                                    placeholder="e.g. Cozy Cottage near the Lake"
                                    size="lg"
                                />
                            </Box>
                            <Box>
                                <Text fontWeight="bold" mb={2}>Description</Text>
                                <Textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={(e) => updateField("description", e.target.value)}
                                    placeholder="Describe your place..."
                                    rows={6}
                                />
                            </Box>
                            <Box>
                                <Text fontWeight="bold" mb={2}>Price per night ($)</Text>
                                <Input
                                    name="price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => updateField("price", e.target.value)}
                                    placeholder="100"
                                    size="lg"
                                />
                            </Box>
                        </VStack>
                    )}

                    {/* STEP 3: Location */}
                    {step === 3 && (
                        <VStack gap={6} align="stretch">
                            <Heading>Where is your place located?</Heading>
                            <Box>
                                <Text fontWeight="bold" mb={2}>Address</Text>
                                <Input
                                    name="address"
                                    value={formData.address}
                                    onChange={(e) => updateField("address", e.target.value)}
                                    placeholder="Street address"
                                />
                            </Box>
                            <HStack>
                                <Box flex={1}>
                                    <Text fontWeight="bold" mb={2}>City</Text>
                                    <Input
                                        name="city"
                                        value={formData.city}
                                        onChange={(e) => updateField("city", e.target.value)}
                                        placeholder="City"
                                    />
                                </Box>
                                <Box flex={1}>
                                    <Text fontWeight="bold" mb={2}>Country</Text>
                                    <Input
                                        name="country"
                                        value={formData.country}
                                        onChange={(e) => updateField("country", e.target.value)}
                                        placeholder="Country"
                                    />
                                </Box>
                            </HStack>
                        </VStack>
                    )}

                    {/* STEP 4: Amenities & Photos */}
                    {step === 4 && (
                        <VStack gap={8} align="stretch">
                            <Box>
                                <Heading size="md" mb={4}>What amenities do you offer?</Heading>
                                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                    {amenities.map((amenity: any) => (
                                        <HStack
                                            key={amenity.id}
                                            as="label"
                                            cursor="pointer"
                                            borderWidth="1px"
                                            p={3}
                                            borderRadius="md"
                                            bg={formData.amenities.includes(amenity.id) ? "gray.50" : "white"}
                                            borderColor={formData.amenities.includes(amenity.id) ? "black" : "gray.200"}
                                        >
                                            <input
                                                type="checkbox"
                                                name="amenities"
                                                value={amenity.id}
                                                checked={formData.amenities.includes(amenity.id)}
                                                onChange={() => toggleAmenity(amenity.id)}
                                                style={{ marginRight: "10px" }}
                                            />
                                            <Text>{amenity.name}</Text>
                                        </HStack>
                                    ))}
                                </SimpleGrid>
                            </Box>

                            <Box>
                                <Heading size="md" mb={4}>Add a photo</Heading>
                                <Input
                                    name="photo"
                                    value={formData.photo}
                                    onChange={(e) => updateField("photo", e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                />
                                <Text fontSize="sm" color="gray.500" mt={2}>
                                    For now, simply paste a URL to an image.
                                </Text>
                            </Box>
                        </VStack>
                    )}

                </VStack>

                {/* Hidden Inputs to ensure all data is submitted regardless of current step */}
                <input type="hidden" name="categoryId" value={formData.categoryId} />
                <input type="hidden" name="title" value={formData.title} />
                <input type="hidden" name="description" value={formData.description} />
                <input type="hidden" name="price" value={formData.price} />
                <input type="hidden" name="address" value={formData.address} />
                <input type="hidden" name="city" value={formData.city} />
                <input type="hidden" name="country" value={formData.country} />
                <input type="hidden" name="photo" value={formData.photo} />
                {formData.amenities.map(id => (
                    <input key={id} type="hidden" name="amenities" value={id} />
                ))}
            </Form>

            {/* Navigation Buttons - Moved OUTSIDE Form to prevent accidental submission */}
            <HStack justify="space-between" pt={8} borderTopWidth="1px" mt={8}>
                <Button
                    variant="ghost"
                    type="button"
                    onClick={prevStep}
                    disabled={step === 1}
                    visibility={step === 1 ? "hidden" : "visible"}
                >
                    Back
                </Button>

                {step < totalSteps ? (
                    <Button
                        colorPalette="black"
                        type="button"
                        onClick={nextStep}
                        disabled={isNextDisabled()}
                    >
                        Next
                    </Button>
                ) : (
                    <Button
                        type="button"
                        colorPalette="red"
                        loading={isSubmitting}
                        size="lg"
                        px={8}
                        onClick={(e) => {
                            e.preventDefault();
                            const form = document.getElementById("room-form") as HTMLFormElement;
                            if (form) form.requestSubmit();
                        }}
                    >
                        Create Listing
                    </Button>
                )}
            </HStack>

            {actionData?.error && (
                <Box mt={4} p={4} bg="red.50" color="red.500" borderRadius="md">
                    <Text fontWeight="bold">Error: {actionData.error}</Text>
                </Box>
            )}
        </Container>
    );
}
