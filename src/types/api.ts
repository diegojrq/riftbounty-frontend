/** Standard API response: { status, message?, data } */

export interface ApiSuccess<T> {
  status: "success" | "ok";
  message?: string;
  data: T;
}

export interface ApiError {
  status: "error";
  message?: string;
  data?: unknown;
}
