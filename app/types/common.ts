/**
 * Common types used across multiple domains
 */

/**
 * Base API response structure for paginated endpoints
 */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

/**
 * Base entity with primary key
 */
export interface BaseEntity {
    pk: number | string;
}

