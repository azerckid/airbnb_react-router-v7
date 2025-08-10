import { Avatar, Box, Button, Container, Grid, HStack, Heading, IconButton, Text, Textarea, VStack } from "@chakra-ui/react";
import { FaStar, FaRegStar, FaReply } from "react-icons/fa";
import type { IReview } from "~/types";
import {
    DialogBackdrop,
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
    DialogPositioner,
} from "@chakra-ui/react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { createReview, createReviewReply } from "~/utils/api";
import { toaster } from "~/components/ui/toaster";

interface RoomReviewsProps {
    reviews: IReview[];
    rating: number;
    roomPk?: number | string;
    isOwner?: boolean;
}

export function RoomReviews({ reviews, rating, roomPk, isOwner }: RoomReviewsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const revalidator = useRevalidator();

    const handleReplySubmit = async (reviewPk: number) => {
        if (!roomPk) return;
        if (!replyText.trim()) {
            toaster.create({
                title: "Reply text is required",
                type: "error",
            });
            return;
        }

        setIsSubmittingReply(true);
        try {
            await createReviewReply(roomPk, reviewPk, replyText);
            toaster.create({
                title: "Reply submitted!",
                description: "Your reply has been added.",
                type: "success",
            });
            setReplyingTo(null);
            setReplyText("");
            revalidator.revalidate();
        } catch (error: any) {
            let message = "Failed to submit reply.";
            if (error.message.includes("UNAUTHORIZED")) {
                message = "Please log in to reply.";
            }
            toaster.create({
                title: "Error",
                description: message,
                type: "error",
            });
        } finally {
            setIsSubmittingReply(false);
        }
    };

    const handleSubmit = async () => {
        if (!roomPk) return;
        if (!reviewText.trim()) {
            toaster.create({
                title: "Review text is required",
                type: "error",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await createReview(roomPk, { payload: reviewText, rating: reviewRating });
            toaster.create({
                title: "Review submitted!",
                description: "Thank you for your feedback.",
                type: "success",
            });
            setIsOpen(false);
            setReviewText("");
            setReviewRating(5);
            revalidator.revalidate();
        } catch (error: any) {
            let message = "Failed to submit review.";
            if (error.message.includes("UNAUTHORIZED")) {
                message = "Please log in to write a review.";
            }
            toaster.create({
                title: "Error",
                description: message,
                type: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box mt={{ base: 6, md: 10 }}>
            <HStack justifyContent="space-between" mb={5} alignItems="center">
                <Heading fontSize={{ base: "xl", md: "2xl" }}>
                    <HStack gap={2} flexWrap="wrap">
                        <FaStar /> <Text>{rating}</Text>
                        <Text>∙</Text>
                        <Text>
                            {reviews.length} review{reviews.length === 1 ? "" : "s"}
                        </Text>
                    </HStack>
                </Heading>
                {roomPk && !isOwner && (
                    <DialogRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
                        <DialogTrigger asChild>
                            <Button colorPalette="red" variant="solid">
                                Write a Review
                            </Button>
                        </DialogTrigger>
                        <DialogBackdrop />
                        <DialogPositioner>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Write a Review</DialogTitle>
                                </DialogHeader>
                                <DialogBody>
                                    <VStack gap={4} alignItems="stretch">
                                        <VStack alignItems="flex-start" gap={2}>
                                            <Text fontWeight="medium">Rating</Text>
                                            <HStack gap={1}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <IconButton
                                                        key={star}
                                                        variant="ghost"
                                                        colorPalette="yellow"
                                                        size="sm"
                                                        onMouseEnter={() => setHoverRating(star)}
                                                        onMouseLeave={() => setHoverRating(0)}
                                                        onClick={() => setReviewRating(star)}
                                                        aria-label={`${star} stars`}
                                                    >
                                                        {star <= (hoverRating || reviewRating) ? (
                                                            <FaStar size={20} />
                                                        ) : (
                                                            <FaRegStar size={20} />
                                                        )}
                                                    </IconButton>
                                                ))}
                                            </HStack>
                                        </VStack>
                                        <Textarea
                                            placeholder="Write your review here..."
                                            value={reviewText}
                                            onChange={(e) => setReviewText(e.target.value)}
                                            rows={5}
                                        />
                                    </VStack>
                                </DialogBody>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button colorPalette="red" onClick={handleSubmit} loading={isSubmitting}>
                                        Submit Review
                                    </Button>
                                </DialogFooter>
                                <DialogCloseTrigger />
                            </DialogContent>
                        </DialogPositioner>
                    </DialogRoot>
                )}
            </HStack>

            <Grid
                templateColumns={{
                    base: "1fr",
                    md: "1fr 1fr",
                }}
                gap={{ base: 6, md: 10 }}
                mt={{ base: 8, md: 16 }}
            >
                {reviews.length > 0 ? (
                    <Box gridColumn={{ md: "span 2" }}>
                        <Container maxW="container.lg" mx="0" px={{ base: 0, md: 4 }}>
                            <VStack gap={{ base: 6, md: 10 }} alignItems="stretch">
                                {reviews.map((review, index) => (
                                    <VStack key={index} alignItems="flex-start" gap={3} w="100%">
                                        <HStack gap={3} alignItems="flex-start" w="100%">
                                            <Avatar.Root size="md">
                                                <Avatar.Image src={review.user.avatar} alt={review.user.name || review.user.username} />
                                                <Avatar.Fallback name={review.user.name || review.user.username} />
                                            </Avatar.Root>
                                            <VStack alignItems="flex-start" gap={1} flex={1}>
                                                <Text fontWeight="bold" fontSize="md">
                                                    {review.user.name || review.user.username}
                                                </Text>
                                                <HStack gap={1} alignItems="center">
                                                    <FaStar size={12} />
                                                    <Text fontSize="sm">{review.rating}</Text>
                                                    {review.created_at && (
                                                        <>
                                                            <Text fontSize="sm" color="gray.500">∙</Text>
                                                            <Text fontSize="sm" color="gray.500">
                                                                {new Date(review.created_at).toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                })}
                                                            </Text>
                                                        </>
                                                    )}
                                                </HStack>
                                            </VStack>
                                            {review.pk && (
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (review.pk !== undefined) {
                                                            if (replyingTo === review.pk) {
                                                                setReplyingTo(null);
                                                                setReplyText("");
                                                            } else {
                                                                setReplyingTo(review.pk);
                                                                setReplyText("");
                                                            }
                                                        }
                                                    }}
                                                    aria-label="Reply to review"
                                                >
                                                    <FaReply />
                                                </IconButton>
                                            )}
                                        </HStack>
                                        <Text fontSize="sm" color="gray.600" lineHeight="tall">
                                            {review.payload}
                                        </Text>

                                        {/* Display existing reply */}
                                        {review.reply && (
                                            <Box
                                                w="100%"
                                                ml="50px"
                                                pl={4}
                                                borderLeftWidth="2px"
                                                borderLeftColor="gray.300"
                                                mt={2}
                                            >
                                                <VStack alignItems="flex-start" gap={2}>
                                                    <HStack gap={2} alignItems="center" w="100%">
                                                        <Avatar.Root size="sm">
                                                            <Avatar.Image src={review.reply_user?.avatar} alt={review.reply_user?.name || review.reply_user?.username} />
                                                            <Avatar.Fallback name={review.reply_user?.name || review.reply_user?.username} />
                                                        </Avatar.Root>
                                                        <HStack gap={1} alignItems="center" flex={1}>
                                                            <Text fontWeight="semibold" fontSize="sm">
                                                                {review.reply_user?.name || review.reply_user?.username}
                                                            </Text>
                                                            {review.reply_created_at && (
                                                                <>
                                                                    <Text fontSize="xs" color="gray.500">∙</Text>
                                                                    <Text fontSize="xs" color="gray.500">
                                                                        {new Date(review.reply_created_at).toLocaleDateString("en-US", {
                                                                            month: "short",
                                                                            day: "numeric",
                                                                            year: "numeric",
                                                                        })}
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </HStack>
                                                    </HStack>
                                                    <Text fontSize="sm" color="gray.600">
                                                        {review.reply}
                                                    </Text>
                                                </VStack>
                                            </Box>
                                        )}

                                        {/* Reply form */}
                                        {replyingTo === review.pk && (
                                            <VStack w="100%" gap={2} mt={2}>
                                                <Textarea
                                                    placeholder="Write your reply..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    rows={3}
                                                    size="sm"
                                                />
                                                <HStack gap={2} w="100%" justifyContent="flex-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setReplyingTo(null);
                                                            setReplyText("");
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        colorPalette="red"
                                                        onClick={() => review.pk && handleReplySubmit(review.pk)}
                                                        loading={isSubmittingReply}
                                                    >
                                                        Submit Reply
                                                    </Button>
                                                </HStack>
                                            </VStack>
                                        )}
                                    </VStack>
                                ))}
                            </VStack>
                        </Container>
                    </Box>
                ) : (
                    <Text color="gray.500">No reviews yet.</Text>
                )}
            </Grid>
        </Box>
    );
}

