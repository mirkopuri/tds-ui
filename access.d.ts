export type AppRole = "READER" | "EDITOR" | "ADMIN";

export interface AccessSession {
  apps?: Record<string, string>;
  iat?: number;
  [key: string]: unknown;
}

export const REFRESH_AFTER_SECONDS: number;
export function roleFor(session: AccessSession | null | undefined, appId: string): AppRole | null;
export function hasAnyApp(session: AccessSession | null | undefined): boolean;
export function canWrite(role: AppRole | null | undefined): boolean;
export function isMutating(method: string): boolean;
export function isDocumentRequest(method: string, headers: { get(name: string): string | null }): boolean;
export function needsRefresh(session: AccessSession | null | undefined, nowMs?: number): boolean;
export function refreshUrl(hubLoginUrl: string, currentUrl: string): string;

export interface CheckAccessOptions {
  session: AccessSession;
  appId: string;
  url: string;
  method: string;
  headers: { get(name: string): string | null };
  hubLoginUrl: string;
  crossAppReadPrefix?: string;
  writeAlso?: { path: string; apps: string[] }[];
}

export type AccessDecision =
  | { action: "allow" }
  | { action: "redirect"; url: string }
  | { action: "deny"; status: number; error: string; message: string; html?: string };

export function checkAccess(options: CheckAccessOptions): AccessDecision;
