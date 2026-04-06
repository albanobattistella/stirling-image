export type Permission =
  | "tools:use"
  | "files:own"
  | "files:all"
  | "apikeys:own"
  | "apikeys:all"
  | "pipelines:own"
  | "pipelines:all"
  | "settings:read"
  | "settings:write"
  | "users:manage"
  | "teams:manage"
  | "branding:manage";

export type Role = "admin" | "user";
