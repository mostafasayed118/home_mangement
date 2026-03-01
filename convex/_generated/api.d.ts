/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apartments from "../apartments.js";
import type * as auth from "../auth.js";
import type * as documents from "../documents.js";
import type * as emails from "../emails.js";
import type * as invoices from "../invoices.js";
import type * as maintenance from "../maintenance.js";
import type * as payments from "../payments.js";
import type * as seed from "../seed.js";
import type * as summaries from "../summaries.js";
import type * as tenants from "../tenants.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apartments: typeof apartments;
  auth: typeof auth;
  documents: typeof documents;
  emails: typeof emails;
  invoices: typeof invoices;
  maintenance: typeof maintenance;
  payments: typeof payments;
  seed: typeof seed;
  summaries: typeof summaries;
  tenants: typeof tenants;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
