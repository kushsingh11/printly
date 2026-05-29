"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { createUser, getUserByEmail } from "@/lib/sheets";

export type AuthState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error; // re-throw the redirect
  }
  return undefined;
}

const registerSchema = z.object({
  name: z.string().min(2, "Enter your name."),
  email: z.string().email("Enter a valid email."),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/u, "Enter a 10-digit phone number.")
    .optional()
    .or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await getUserByEmail(email);
  if (existing) return { error: "An account with this email already exists." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await createUser({
    name: parsed.data.name.trim(),
    email,
    phone: parsed.data.phone || null,
    passwordHash,
    role: "STUDENT",
  });

  try {
    await signIn("credentials", { email, password: parsed.data.password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Account created — please log in." };
    throw error;
  }
  return undefined;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function googleLogin() {
  await signIn("google", { redirectTo: "/" });
}
