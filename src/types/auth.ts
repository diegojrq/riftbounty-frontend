/** API contract: /v1/auth/* */

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
