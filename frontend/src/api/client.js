import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export async function apiFetch(path, options = {}) {
  const token = await getToken();

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function uploadAudit(file) {
  const token = await getToken();
  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${API_URL}/degree/upload-audit`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function uploadSyllabus(file) {
  const token = await getToken();
  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${API_URL}/upload-syllabus/`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
    // No Content-Type header — browser sets it automatically with the multipart boundary
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }
  return res.json();
}
