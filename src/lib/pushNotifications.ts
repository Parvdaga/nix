import { supabase } from "./supabaseClient";

const VAPID_PUBLIC_KEY = "BFWrP0FwrdlDEaCy0P0EC-koC4VODTXpqStryorsSEnxeYJAyANGauAxrFj7AbyHL7NKxJrNRjDxqvMTP8WmLr4";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(profileId: string): Promise<boolean> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied.");
  }

  // Register push subscription
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // Save/Upsert subscription to Supabase
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({
      profile_id: profileId,
      subscription: subscription.toJSON(),
    }, {
      onConflict: "profile_id,subscription"
    });

  if (error) {
    throw new Error(`Failed to save notification subscription to database: ${error.message}`);
  }

  return true;
}

export async function triggerPushNotifications(
  groupId: string,
  title: string,
  body: string,
  senderId: string
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("No active session found. Skipping push notification trigger.");
      return;
    }

    const res = await fetch("/api/trigger-push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        groupId,
        title,
        body,
        senderId,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Failed to trigger push notifications backend API:", errorText);
    }
  } catch (err) {
    console.error("Error triggering push notifications:", err);
  }
}
