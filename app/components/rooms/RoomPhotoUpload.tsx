import { Box, Button, HStack, Input, Text, Textarea, VStack, Image } from "@chakra-ui/react";
import { Form } from "react-router";
import { FaCamera, FaUpload } from "react-icons/fa";
import { useState, useRef } from "react";

interface RoomPhotoUploadProps {
    actionData?: { error?: string } | null;
}

export function RoomPhotoUpload({ actionData }: RoomPhotoUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [description, setDescription] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Box mb={8} p={{ base: 4, md: 6 }} borderWidth="1px" borderRadius="lg" bg="gray.50">
            <Form method="post" encType="multipart/form-data">
                <VStack gap={4}>
                    <Input type="hidden" name="intent" value="upload" />
                    <Box w="100%">
                        <Text mb={2} fontWeight="medium">
                            Select Photo
                        </Text>
                        <Box
                            borderWidth="2px"
                            borderStyle="dashed"
                            borderColor={preview ? "gray.300" : "gray.400"}
                            borderRadius="lg"
                            p={4}
                            textAlign="center"
                            position="relative"
                            cursor="pointer"
                            _hover={{ borderColor: "red.400" }}
                        >
                            {preview ? (
                                <VStack gap={2}>
                                    <Image
                                        src={preview}
                                        alt="Preview"
                                        maxH="200px"
                                        maxW="100%"
                                        borderRadius="md"
                                        objectFit="contain"
                                    />
                                    <Text fontSize="sm" color="gray.600">
                                        {selectedFile?.name}
                                    </Text>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setPreview(null);
                                            if (fileInputRef.current) {
                                                fileInputRef.current.value = "";
                                            }
                                        }}
                                    >
                                        Change Photo
                                    </Button>
                                </VStack>
                            ) : (
                                <VStack gap={2}>
                                    <FaCamera size={32} />
                                    <Text>Click to select a photo</Text>
                                </VStack>
                            )}
                            <Input
                                ref={fileInputRef}
                                name="file"
                                type="file"
                                accept="image/*"
                                required
                                onChange={handleFileChange}
                                position="absolute"
                                top={0}
                                left={0}
                                width="100%"
                                height="100%"
                                opacity={0}
                                cursor="pointer"
                            />
                        </Box>
                    </Box>
                    <Box w="100%">
                        <Text mb={2} fontWeight="medium">
                            Description (Optional)
                        </Text>
                        <Textarea
                            name="description"
                            placeholder="Describe this photo..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </Box>
                    {actionData?.error && (
                        <Box
                            color="red.500"
                            fontSize="sm"
                            w="100%"
                            p={2}
                            bg="red.50"
                            borderRadius="md"
                        >
                            {actionData.error}
                        </Box>
                    )}
                    <Button
                        type="submit"
                        colorPalette="red"
                        w="100%"
                        disabled={!selectedFile}
                    >
                        <HStack gap={2}>
                            <FaUpload />
                            <Text>Upload Photo</Text>
                        </HStack>
                    </Button>
                </VStack>
            </Form>
        </Box>
    );
}

