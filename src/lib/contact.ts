import { apiPost } from "./api";
import type { ApiSuccess } from "@/types/api";

export interface ContactPayload {
  email: string;
  subject: string;
  message: string;
}

export interface ContactResponseData {
  id: string;
}

/** POST /v1/contact — público (X-API-Key via proxy) ou com Bearer se logado. */
export async function submitContact(
  payload: ContactPayload
): Promise<ApiSuccess<ContactResponseData>> {
  return apiPost<ContactResponseData>("contact", payload);
}
