import axios from "axios";

// Shared browser axios instance for auth-gated calls.
// withCredentials sends/receives the http-only auth cookie set by the API.
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});
