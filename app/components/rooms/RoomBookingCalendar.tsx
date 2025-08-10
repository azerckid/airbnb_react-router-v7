import { Box, Button, Text, VStack, HStack, Separator, SimpleGrid } from "@chakra-ui/react";
import { DayPicker, type DateRange } from "react-day-picker";
import { startOfToday, addMonths, isBefore } from "date-fns";
import { useState, useEffect } from "react";
import { checkBooking, createBooking, getBookingStatus, type CheckBookingResponse, type BookingStatusResponse } from "~/utils/api";
import { parseApiError } from "~/utils/error";
import { formatDate, formatBookingDate } from "~/utils/date";
import { toaster } from "~/components/ui/toaster";
import "react-day-picker/dist/style.css";

interface RoomBookingCalendarProps {
    roomPk: number;
}

export function RoomBookingCalendar({ roomPk }: RoomBookingCalendarProps) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [checkBookingData, setCheckBookingData] = useState<CheckBookingResponse | null>(null);
    const [bookingStatus, setBookingStatus] = useState<BookingStatusResponse | null>(null);
    const [isCheckingBooking, setIsCheckingBooking] = useState(false);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [isCreatingBooking, setIsCreatingBooking] = useState(false);

    const handleDateRangeChange = (range: DateRange | undefined) => {
        setDateRange(range);
        setCheckBookingData(null); // 날짜 변경 시 이전 결과 초기화
    };

    const handleBookingClick = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            return;
        }

        const checkIn = formatDate(dateRange.from);
        const checkOut = formatDate(dateRange.to);

        setIsCreatingBooking(true);
        try {
            await createBooking(roomPk, checkIn, checkOut);
            toaster.create({
                title: "Booking successful!",
                description: "Your booking has been confirmed.",
                type: "success",
                duration: 5000,
            });
            // 예약 성공 후 날짜 초기화
            setDateRange(undefined);
            setCheckBookingData(null);
        } catch (error) {
            const errorMessage = parseApiError(error, "Failed to create booking. Please try again.");
            toaster.create({
                title: "Booking failed",
                description: errorMessage,
                type: "error",
                duration: 5000,
            });
        } finally {
            setIsCreatingBooking(false);
        }
    };

    // Check booking availability and get booking status when date range is selected
    useEffect(() => {
        if (dateRange?.from && dateRange?.to) {
            const checkIn = formatDate(dateRange.from);
            const checkOut = formatDate(dateRange.to);

            setIsCheckingBooking(true);
            setIsLoadingStatus(true);

            // 예약 가능 여부 확인과 예약 상황 조회를 병렬로 수행
            Promise.all([
                checkBooking(roomPk, checkIn, checkOut, 1)
                    .then((data: CheckBookingResponse) => {
                        if (import.meta.env.DEV) {
                            console.log("Booking check response:", data);
                        }
                        return data;
                    })
                    .catch((error: unknown) => {
                        console.error("Failed to check booking:", error);
                        // 서버 체크 실패 시에도 예약 시도 가능하도록 null로 설정
                        return null;
                    }),
                getBookingStatus(roomPk, checkIn, checkOut)
                    .then((data: BookingStatusResponse) => {
                        if (import.meta.env.DEV) {
                            console.log("Booking status response:", data);
                        }
                        return data;
                    })
                    .catch((error: unknown) => {
                        console.error("Failed to get booking status:", error);
                        return null;
                    }),
            ]).then(([checkData, statusData]) => {
                setCheckBookingData(checkData);
                setBookingStatus(statusData);
            }).finally(() => {
                setIsCheckingBooking(false);
                setIsLoadingStatus(false);
            });
        } else {
            setCheckBookingData(null);
            setBookingStatus(null);
        }
    }, [dateRange, roomPk]);

    return (
        <Box pt={{ base: 0, md: 10 }}>
            <DayPicker
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
                fromDate={startOfToday()}
                toDate={addMonths(startOfToday(), 6)}
                disabled={(date) => isBefore(date, startOfToday())}
                className="chakra-day-picker"
            />
            {dateRange?.from && dateRange?.to && (
                <VStack align="stretch" gap={4} mt={5}>
                    <Box
                        p={4}
                        borderWidth="1px"
                        borderRadius="md"
                        bg="gray.50"
                        _dark={{ bg: "gray.800" }}
                    >
                        <VStack align="stretch" gap={1}>
                            <Text fontWeight="semibold" fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
                                예약
                            </Text>
                            <Text fontSize="sm">
                                {formatBookingDate(dateRange.from, 14)} (체크인)에서{" "}
                                {formatBookingDate(dateRange.to, 11)} (체크아웃)까지
                            </Text>
                        </VStack>
                    </Box>

                    {isLoadingStatus ? (
                        <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" _dark={{ bg: "gray.800" }}>
                            <Text fontSize="sm" color="gray.500">예약 상황을 불러오는 중...</Text>
                        </Box>
                    ) : bookingStatus ? (
                        <Box
                            p={4}
                            borderWidth="1px"
                            borderRadius="md"
                            bg="blue.50"
                            _dark={{ bg: "blue.900" }}
                        >
                            <VStack align="stretch" gap={3}>
                                <Text fontWeight="semibold" fontSize="sm" color="blue.700" _dark={{ color: "blue.300" }}>
                                    예약 상황
                                </Text>
                                <SimpleGrid columns={2} gap={3}>
                                    <Box>
                                        <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>
                                            수용 인원
                                        </Text>
                                        <Text fontSize="sm" fontWeight="medium">
                                            {bookingStatus.room_capacity}명
                                        </Text>
                                    </Box>
                                    <Box>
                                        <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>
                                            예약된 인원
                                        </Text>
                                        <Text fontSize="sm" fontWeight="medium">
                                            {bookingStatus.total_booked_guests}명
                                        </Text>
                                    </Box>
                                    <Box>
                                        <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>
                                            사용 가능한 침대
                                        </Text>
                                        <Text fontSize="sm" fontWeight="medium" color="green.600" _dark={{ color: "green.400" }}>
                                            {bookingStatus.available_beds}개
                                        </Text>
                                    </Box>
                                    <Box>
                                        <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>
                                            점유율
                                        </Text>
                                        <Text fontSize="sm" fontWeight="medium">
                                            {bookingStatus.summary.occupancy_rate.toFixed(1)}%
                                        </Text>
                                    </Box>
                                </SimpleGrid>
                                {bookingStatus.bookings.room_bookings.length > 0 && (
                                    <>
                                        <Separator />
                                        <Box>
                                            <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }} mb={2}>
                                                예약 목록 ({bookingStatus.summary.total_bookings}건)
                                            </Text>
                                            <VStack align="stretch" gap={2}>
                                                {bookingStatus.bookings.room_bookings.map((booking) => (
                                                    <Box
                                                        key={booking.pk}
                                                        p={2}
                                                        bg="white"
                                                        _dark={{ bg: "gray.800" }}
                                                        borderRadius="sm"
                                                        borderWidth="1px"
                                                    >
                                                        <HStack justify="space-between">
                                                            <VStack align="start" gap={0}>
                                                                <Text fontSize="xs" fontWeight="medium">
                                                                    {formatBookingDate(new Date(booking.check_in), 14)} ~{" "}
                                                                    {formatBookingDate(new Date(booking.check_out), 11)}
                                                                </Text>
                                                                <Text fontSize="xs" color="gray.500">
                                                                    {booking.guests}명
                                                                </Text>
                                                            </VStack>
                                                            <Text fontSize="xs" fontWeight="medium" color="blue.600" _dark={{ color: "blue.400" }}>
                                                                ₩{booking.price.toLocaleString()}
                                                            </Text>
                                                        </HStack>
                                                    </Box>
                                                ))}
                                            </VStack>
                                        </Box>
                                    </>
                                )}
                            </VStack>
                        </Box>
                    ) : null}
                </VStack>
            )}
            <Button
                disabled={
                    !dateRange?.from ||
                    !dateRange?.to ||
                    (checkBookingData !== null && checkBookingData.available === false && !checkBookingData.message?.includes("Failed to check")) ||
                    isCreatingBooking
                }
                loading={isCreatingBooking}
                onClick={handleBookingClick}
                mt={5}
                w="100%"
                colorPalette="red"
            >
                Make booking
            </Button>
            {!isCheckingBooking && checkBookingData && !checkBookingData.available && (
                <Box mt={2}>
                    <Text color="red.500" fontSize="sm" fontWeight="medium">
                        {checkBookingData.message || "Can't book on those dates, sorry."}
                    </Text>
                    {checkBookingData.details && (
                        <VStack align="stretch" gap={1} mt={2}>
                            {checkBookingData.reason === "INSUFFICIENT_BEDS" && checkBookingData.details.available_beds !== undefined && (
                                <Text color="red.400" fontSize="xs">
                                    사용 가능한 침대: {checkBookingData.details.available_beds}개
                                    {checkBookingData.details.room_capacity !== undefined &&
                                        ` / 전체 침대: ${checkBookingData.details.room_capacity}개`}
                                </Text>
                            )}
                            {checkBookingData.reason === "EXCEEDS_CAPACITY" && checkBookingData.details.room_capacity !== undefined && (
                                <Text color="red.400" fontSize="xs">
                                    최대 수용 인원: {checkBookingData.details.room_capacity}명
                                </Text>
                            )}
                        </VStack>
                    )}
                </Box>
            )}
        </Box>
    );
}

