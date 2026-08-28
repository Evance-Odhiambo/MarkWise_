import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { PrismaClient } from "../../generated/prisma/client.js";

const messagingClient = () => {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || undefined,
    });
  return getMessaging(app);
};

export async function sendPushNotification(
  prisma: PrismaClient,
  input: {
    userId: string;
    userType: "student" | "lecturer";
    title: string;
    body: string;
    data?: Record<string, unknown>;
  },
) {
  const token =
    input.userType === "student"
      ? (await prisma.student.findUnique({
          where: { id: input.userId },
          select: { pushToken: true },
        }))?.pushToken
      : (await prisma.lecturer.findUnique({
          where: { id: input.userId },
          select: { fcmToken: true },
        }))?.fcmToken;
  if (!token) return;

  try {
    await messagingClient().send({
      token,
      notification: { title: input.title, body: input.body },
      data: Object.fromEntries(
        Object.entries(input.data || {}).map(([key, value]) => [
          key,
          String(value ?? ""),
        ]),
      ),
    });
  } catch (error) {
    // Notification persistence must not fail because a device token is stale.
    console.warn("FCM delivery failed", error);
  }
}

export function createNotificationService() {
  return { sendPushNotification } as const;
}
