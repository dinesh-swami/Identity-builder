import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'indeity_personal_execution_os_secure_secret_key_2026_at_least_32_chars'
);

const COOKIE_NAME = 'indeity_session';

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string | null | undefined,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
  settings: {
    dailyTargetMinutes: number;
    timezone: string;
    targetSleepTime: string;
    targetWakeTime: string;
  };
} | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { settings: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      settings: user.settings
        ? {
            dailyTargetMinutes: user.settings.dailyTargetMinutes,
            timezone: user.settings.timezone,
            targetSleepTime: user.settings.targetSleepTime,
            targetWakeTime: user.settings.targetWakeTime,
          }
        : {
            dailyTargetMinutes: 480,
            timezone: 'Asia/Kolkata',
            targetSleepTime: '23:00',
            targetWakeTime: '07:00',
          },
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: You must be logged in to perform this operation.');
  }
  return user;
}
