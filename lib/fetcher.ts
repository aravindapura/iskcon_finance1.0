import { apiFetch } from "./apiClient";

export type FetcherError = Error & { status?: number };

export const fetcher = (url: string) =>
  apiFetch(url).then(async (res) => {
    if (res.status === 401) {
      const error: FetcherError = new Error("Unauthorized");
      error.status = 401;
      throw error;
    }

    if (!res.ok) {
      const error: FetcherError = new Error("Request failed");
      error.status = res.status;
      throw error;
    }

    return res.json();
  });
