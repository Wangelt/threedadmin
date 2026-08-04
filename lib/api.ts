import { clearSession, getToken } from "./auth";
import type { ApiErrorBody, ApiSuccess } from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://threednet.vercel.app/api";

export class ApiError extends Error {
  status: number;
  body?: ApiErrorBody;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(
    path.startsWith("http") ? path : `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  );
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

function friendlyNetworkMessage(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err || "");
  const origin =
    typeof window !== "undefined" ? window.location.origin : "this origin";

  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(raw)) {
    const usingVercel = /vercel\.app/i.test(BASE_URL);
    return usingVercel
      ? `Cannot reach ${BASE_URL} from ${origin}. Large uploads often fail on Vercel (request size limit). We compress images on save — try again, or use a smaller photo / local API.`
      : `Cannot reach the API at ${BASE_URL} from ${origin}. Usually this means the server is down, CORS blocked the request, or the connection dropped during upload.`;
  }

  if (/aborted|timeout/i.test(raw)) {
    return "The request timed out. Try a smaller image (max 10MB) or check your connection.";
  }

  return raw || "Network request failed.";
}

export function getErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return friendlyNetworkMessage(err) || fallback;
  return fallback;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, formData, query } = options;
  const headers: HeadersInit = {};

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Do NOT set Content-Type for FormData — browser must set multipart boundary.
  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: payload,
    });
  } catch (err) {
    throw new ApiError(friendlyNetworkMessage(err), 0);
  }

  let json: ApiSuccess<T> | ApiErrorBody | null = null;
  try {
    json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;
  } catch {
    json = null;
  }

  if (res.status === 401 && auth) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  if (!res.ok || !json || json.success === false) {
    let message =
      json && "message" in json && json.message
        ? json.message
        : `Request failed (${res.status})`;

    if (res.status === 0) {
      message = friendlyNetworkMessage(new Error("Failed to fetch"));
    } else if (res.status === 413) {
      message = "File is too large for the server. Use an image under 10MB.";
    } else if (res.status === 503) {
      message =
        json && "message" in json && json.message
          ? json.message
          : "Upload service is unavailable (Cloudinary may not be configured on the API).";
    }

    throw new ApiError(
      message,
      res.status,
      json && "success" in json && !json.success ? json : undefined
    );
  }

  return (json as ApiSuccess<T>).data;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
