/**
 * Central export point for all types
 * Import from here: import type { IRoom, IUser } from "~/types";
 */

// Domain-specific types
export type { IRoom, IPhoto, IReview, IOwner, IAmenity, ICategory } from "./room";
export type { IUser } from "./user";
export type { PaginatedResponse, BaseEntity } from "./common";

// Re-export all types for convenience
export * from "./room";
export * from "./user";
export * from "./common";

