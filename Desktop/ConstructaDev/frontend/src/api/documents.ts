import type { Document, DocumentCategory, DocumentStatus } from "../types";
import { apiClient } from "./client";

export async function fetchDocuments(obraId: number): Promise<Document[]> {
  const { data } = await apiClient.get<Document[]>(`/documents/obra/${obraId}`);
  return data;
}

export interface UploadDocumentPayload {
  obraId: number;
  category: DocumentCategory;
  taskId?: number | null;
  notes?: string | null;
  file: File;
}

export async function uploadDocument(payload: UploadDocumentPayload): Promise<Document> {
  const form = new FormData();
  form.append("obra_id", String(payload.obraId));
  form.append("category", payload.category);
  if (payload.taskId != null) form.append("task_id", String(payload.taskId));
  if (payload.notes) form.append("notes", payload.notes);
  form.append("file", payload.file);
  const { data } = await apiClient.post<Document>("/documents/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateDocument(
  id: number,
  patch: { notes?: string | null; status?: DocumentStatus; task_id?: number | null },
): Promise<Document> {
  const { data } = await apiClient.patch<Document>(`/documents/${id}`, patch);
  return data;
}

export async function deleteDocument(id: number): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}
