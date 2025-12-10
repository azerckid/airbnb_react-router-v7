export function parseApiError(error: any, defaultMessage: string = "Something went wrong"): string {
    if (typeof error === "string") return error;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.message) return error.message;
    return defaultMessage;
}
