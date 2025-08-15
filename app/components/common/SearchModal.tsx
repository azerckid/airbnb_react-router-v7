import { Box, Button, Input, VStack, HStack, Text, Heading } from "@chakra-ui/react";
import { FaSearch } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
    DialogRoot,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
} from "~/components/ui/dialog";

export function SearchModal() {
    const navigate = useNavigate();
    const [location, setLocation] = useState("");
    const [guests, setGuests] = useState("1");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const onSearch = () => {
        const params = new URLSearchParams();
        if (location) params.set("location", location);
        if (guests) params.set("guests", guests);
        if (minPrice) params.set("minPrice", minPrice);
        if (maxPrice) params.set("maxPrice", maxPrice);

        // CheckIn/CheckOut could be added here similar to location
        // params.toString() handles encoding

        navigate(`/?${params.toString()}`);
        setIsOpen(false);
    };

    return (
        <DialogRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    borderRadius="full"
                    px={4}
                    h="12"
                    shadow="sm"
                    _hover={{ shadow: "md" }}
                >
                    <HStack gap={3} separator={<Text color="gray.300">|</Text>}>
                        <Text fontWeight="semibold" fontSize="sm">Anywhere</Text>
                        <Text fontWeight="semibold" fontSize="sm">Any week</Text>
                        <HStack gap={2}>
                            <Text color="gray.500" fontWeight="normal" fontSize="sm">Add guests</Text>
                            <Box bg="red.500" p={2} borderRadius="full" color="white">
                                <FaSearch size={12} />
                            </Box>
                        </HStack>
                    </HStack>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Search</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <VStack gap={4} align="stretch">
                        <Box>
                            <Text fontWeight="bold" mb={1} fontSize="sm">Where</Text>
                            <Input
                                placeholder="Search destinations (e.g. Seoul)"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                borderRadius="xl"
                            />
                        </Box>

                        <HStack gap={4}>
                            <Box flex={1}>
                                <Text fontWeight="bold" mb={1} fontSize="sm">Guests</Text>
                                <Input
                                    type="number"
                                    min={1}
                                    value={guests}
                                    onChange={(e) => setGuests(e.target.value)}
                                    borderRadius="xl"
                                />
                            </Box>
                        </HStack>

                        <Text fontWeight="bold" mt={2} fontSize="sm">Price Range</Text>
                        <HStack gap={4}>
                            <Box flex={1}>
                                <Text fontSize="xs" color="gray.500" mb={1}>Min Price</Text>
                                <Input
                                    placeholder="$0"
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    borderRadius="xl"
                                />
                            </Box>
                            <Box flex={1}>
                                <Text fontSize="xs" color="gray.500" mb={1}>Max Price</Text>
                                <Input
                                    placeholder="$1000+"
                                    type="number"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    borderRadius="xl"
                                />
                            </Box>
                        </HStack>

                    </VStack>
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button colorPalette="red" onClick={onSearch} w="full">Search</Button>
                </DialogFooter>
                <DialogCloseTrigger />
            </DialogContent>
        </DialogRoot>
    );
}
