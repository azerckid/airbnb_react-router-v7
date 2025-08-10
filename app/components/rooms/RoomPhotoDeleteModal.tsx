import {
    Button,
    DialogBackdrop,
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogPositioner,
    DialogRoot,
    HStack,
    Heading,
    Text,
} from "@chakra-ui/react";

interface RoomPhotoDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function RoomPhotoDeleteModal({ isOpen, onClose, onConfirm }: RoomPhotoDeleteModalProps) {
    return (
        <DialogRoot open={isOpen} onOpenChange={(e) => {
            if (!e.open) {
                onClose();
            }
        }}>
            <DialogBackdrop />
            <DialogPositioner>
                <DialogContent>
                    <DialogHeader>
                        <Heading size="md">Delete Photo</Heading>
                    </DialogHeader>
                    <DialogBody>
                        <Text>Are you sure you want to delete this photo? This action cannot be undone.</Text>
                    </DialogBody>
                    <DialogFooter>
                        <HStack gap={2}>
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button colorPalette="red" onClick={onConfirm}>
                                Delete
                            </Button>
                        </HStack>
                    </DialogFooter>
                </DialogContent>
            </DialogPositioner>
        </DialogRoot>
    );
}

