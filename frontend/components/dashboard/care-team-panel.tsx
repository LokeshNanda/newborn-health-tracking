"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChildMemberRead, ChildRole } from "@/lib/types";

const ROLE_LABELS: Record<ChildRole, string> = {
  PRIMARY_GUARDIAN: "Primary guardian",
  CAREGIVER: "Caregiver",
  PEDIATRICIAN: "Pediatrician",
};

const ROLE_OPTIONS: ChildRole[] = ["PRIMARY_GUARDIAN", "CAREGIVER", "PEDIATRICIAN"];

interface CareTeamPanelProps {
  members: ChildMemberRead[];
  loading: boolean;
  canManage: boolean;
  currentUserId: string | null;
  onInvite: (values: { email: string; role: ChildRole }) => Promise<void>;
  onUpdateRole: (memberId: string, role: ChildRole) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

export function CareTeamPanel({
  members,
  loading,
  canManage,
  currentUserId,
  onInvite,
  onUpdateRole,
  onRemove,
}: CareTeamPanelProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ChildRole>("CAREGIVER");
  const [invitePending, setInvitePending] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const primaryCount = useMemo(
    () => members.filter((member) => member.role === "PRIMARY_GUARDIAN").length,
    [members],
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInvitePending(true);
    try {
      await onInvite({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      setInviteRole("CAREGIVER");
    } finally {
      setInvitePending(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: ChildRole) => {
    setUpdatingMemberId(memberId);
    try {
      await onUpdateRole(memberId, role);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    setRemovingMemberId(memberId);
    try {
      await onRemove(memberId);
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Care team</h3>
          <p className="text-sm text-muted-foreground">People who can view and manage this child.</p>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teammates yet.</p>
      ) : (
        <ul className="space-y-4">
          {members.map((member) => {
            const isSelf = member.user.id === currentUserId;
            const isPrimary = member.role === "PRIMARY_GUARDIAN";
            const disableRemoval = isPrimary && primaryCount <= 1;
            return (
              <li
                key={member.id}
                className="flex flex-col gap-2 rounded-lg border p-3 text-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {member.user.full_name?.trim() || member.user.email}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  {canManage ? (
                    <select
                      className="flex h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={member.role}
                      onChange={(event) => handleRoleChange(member.id, event.target.value as ChildRole)}
                      disabled={updatingMemberId === member.id}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {ROLE_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={disableRemoval || removingMemberId === member.id}
                      onClick={() => handleRemove(member.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {canManage && (
        <div className="mt-6 space-y-3 rounded-lg border bg-muted/20 p-3">
          <p className="text-sm font-medium">Invite caregiver</p>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Caregiver email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as ChildRole)}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </select>
            <Button onClick={handleInvite} disabled={invitePending || !inviteEmail.trim()}>
              {invitePending ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
