import { supabase } from "@/lib/supabaseClient";
import { GroupMember } from "@/types";

interface GroupMemberRow {
  id: string;
  group_id: string;
  profile_id: string | null;
  dummy_name: string | null;
  dummy_upi_id: string | null;
  name: string | null;
  upi_id: string | null;
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase.rpc("get_group_members_for_group", {
    target_group_id: groupId,
  });

  if (error) throw error;

  return ((data || []) as GroupMemberRow[]).map((member) => ({
    id: member.id,
    group_id: member.group_id,
    profile_id: member.profile_id,
    dummy_name: member.dummy_name,
    dummy_upi_id: member.dummy_upi_id,
    profiles: member.profile_id
      ? {
          name: member.name || "Active User",
          upi_id: member.upi_id,
        }
      : null,
    name: member.name || (member.profile_id ? "Active User" : "Offline Friend"),
    upi_id: member.upi_id,
  }));
}

