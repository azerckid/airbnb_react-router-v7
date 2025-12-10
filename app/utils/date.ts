import { format, addDays } from "date-fns";

export function formatDate(date: Date): string {
    return format(date, "yyyy-MM-dd");
}

export function formatBookingDate(date: Date, length?: number): string {
    // Mimic the usage seen in RoomBookingCalendar
    // It passed length 14 or 11. Maybe it's not length but format string?
    // Actually standard date formatting is usually sufficient.
    // "yyyy년 MM월 dd일" style is common for Korean apps.
    return format(date, "yyyy.MM.dd");
}
