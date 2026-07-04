import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BFWrP0FwrdlDEaCy0P0EC-koC4VODTXpqStryorsSEnxeYJAyANGauAxrFj7AbyHL7NKxJrNRjDxqvMTP8WmLr4";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "5pQTi7mds1D9NJeE4YWlC0j85_0vRay5GJFyteuBZ0c";

webpush.setVapidDetails(
  "mailto:admin@splittracker.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new NextResponse("Unauthorized: Missing Authorization Header", { status: 401 });
    }

    const { groupId, title, body, senderId } = await req.json();

    if (!groupId || !title || !body) {
      return new NextResponse("Bad Request: Missing required parameters", { status: 400 });
    }

    // Create Supabase client using the client's auth header token to check RLS permissions
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // 1. Fetch group members (profile_id) from group_members table for the given groupId
    const { data: members, error: membersError } = await supabase
      .from("group_members")
      .select("profile_id")
      .eq("group_id", groupId)
      .not("profile_id", "is", null);

    if (membersError) {
      return new NextResponse(`Database error: ${membersError.message}`, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ success: true, message: "No members to notify" });
    }

    // Filter out the sender's profile_id
    const targetProfileIds = members
      .map((m) => m.profile_id)
      .filter((pid): pid is string => pid !== null && pid !== senderId);

    if (targetProfileIds.length === 0) {
      return NextResponse.json({ success: true, message: "No other members to notify" });
    }

    // 2. Fetch push subscriptions for those profiles
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .in("profile_id", targetProfileIds);

    if (subsError) {
      return new NextResponse(`Database error fetching subscriptions: ${subsError.message}`, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No active push subscriptions" });
    }

    // 3. Send notifications in parallel
    const payload = JSON.stringify({
      title,
      body,
      url: `/`, // Target client app dashboard page
    });

    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const parsedSub = sub.subscription as any;
        await webpush.sendNotification(parsedSub, payload);
      } catch (err: any) {
        console.error("Web Push failed for subscription:", err);
      }
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true, sentCount: subscriptions.length });
  } catch (err: any) {
    console.error("Error in trigger-push endpoint:", err);
    return new NextResponse(err.message || "Internal Server Error", { status: 500 });
  }
}
