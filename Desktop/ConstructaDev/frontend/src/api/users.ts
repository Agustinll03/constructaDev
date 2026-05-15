import { apiClient } from "./client";

export interface ApiUser {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "collaborator";
  is_active: boolean;
  created_at: string;
}

export async function fetchMe(): Promise<ApiUser> {
  const { data } = await apiClient.get<ApiUser>("/users/me");
  return data;
}

export async function fetchMembers(): Promise<ApiUser[]> {
  const { data } = await apiClient.get<ApiUser[]>("/users");
  return data;
}

export async function inviteMember(email: string, role: "admin" | "collaborator"): Promise<{ invite_token: string; invite_url: string }> {
  const { data } = await apiClient.post("/users/invite", { email, role });
  return data;
}

export async function acceptInvite(token: string, full_name: string, password: string): Promise<string> {
  const { data } = await apiClient.post<{ access_token: string }>("/auth/accept-invite", { token, full_name, password });
  return data.access_token;
}

export async function removeMember(userId: number): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}
