"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Divider,
  Select,
  SelectItem,
  Tab,
  TabGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TabList,
  TabPanel,
  TabPanels,
  TextInput,
} from "@tremor/react";
import { authClient } from "@/utils/auth-client";
import { Copy } from "lucide-react";

export default function OrganizationDetails() {
  const { slug } = useParams();

  const [copied, setCopied] = useState(false);

  // --- Organization + membership state
  const [organization, setOrganization] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);

  // --- UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Invitation form states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");

  // Filters for member list
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Permission checks
  const [canRemoveMember, setCanRemoveMember] = useState(false);
  const [canCancelInvitation, setCanCancelInvitation] = useState(false);
  const [canUpdateRole, setCanUpdateRole] = useState(false);

  // Roles we want in the UI
  const roles = [
    { name: "Owner", value: "owner" },
    { name: "Manager", value: "manager" },
    { name: "Accountant", value: "accountant" },
    { name: "Employee", value: "employee" },
  ];
  // If you want to exclude "owner" from user-selectable roles, filter it out:
  const availableRoles = roles.filter((r) => r.value !== "owner");

  /**
   * 1) On mount, do:
   *   a) setActive({ organizationSlug: slug }) so that the plugin
   *      knows which org is the "active" one in the session.
   *   b) getFullOrganization() (no args) => returns the active org if user is a member
   *   c) If the user truly isn't recognized as a member, `data` might be null,
   *      so handle that gracefully.
   */
  useEffect(() => {
    let mounted = true;

    async function fetchOrgData() {
      try {
        // Step a) set active by slug
        const activeRes = await authClient.organization.setActive({ organizationSlug: slug });
        if (!mounted) return;

        // Check if setActive returned an error
        if (activeRes?.error) {
          throw new Error(activeRes.error.message || "Could not set active organization");
        }

        // Step b) get the now-active org
        const orgRes = await authClient.organization.getFullOrganization(); // no args => use active
        if (!mounted) return;

        if (orgRes?.error) {
          throw new Error(orgRes.error.message || "Failed to fetch organization");
        }

        if (!orgRes.data || !orgRes.data.id) {
          // This usually indicates the user is not a member
          // or there's truly no such org or no membership
          // We'll just show a simple message:
          setOrganization(null);
          setError("This organization does not exist, or you are not a member.");
          return;
        }

        // If we get here, we have a valid org object
        setOrganization(orgRes.data);

        // Step c) fetch the current user's membership
        const memberRes = await authClient.organization.getActiveMember();
        if (memberRes?.error) {
          console.warn("Could not fetch active member:", memberRes.error);
        }

        // If membership not found, fallback to find in org.members
        if (memberRes && memberRes.role) {
          setCurrentMember(memberRes);
        } else if (orgRes.data.members?.length) {
          const sessionRes = await authClient.getSession();
          const userId = sessionRes?.data?.user?.id;
          const fallbackMember = orgRes.data.members.find((m) => m.userId === userId);
          if (fallbackMember) {
            setCurrentMember(fallbackMember);
          }
        }

        // Step d) check some permissions
        const removePerm = await authClient.organization.hasPermission({
          permission: { member: ["delete"] },
        });
        const cancelPerm = await authClient.organization.hasPermission({
          permission: { invitation: ["cancel"] },
        });
        const updatePerm = await authClient.organization.hasPermission({
          permission: { member: ["update"] },
        });
        setCanRemoveMember(removePerm);
        setCanCancelInvitation(cancelPerm);
        setCanUpdateRole(updatePerm);
      } catch (err) {
        setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchOrgData();
    return () => {
      mounted = false;
    };
  }, [slug]);

  // --- 2) Basic loading / error states
  if (loading) {
    return <div className="p-4">Loading organization...</div>;
  }
  if (error) {
    return <div className="p-4">Error: {error}</div>;
  }
  if (!organization) {
    return <div className="p-4">No organization data found.</div>;
  }

  // --- 3) Helper arrays
  const members = organization.members || [];
  const pendingInvitations = (organization.invitations || []).filter(
    (inv) => inv.status === "pending"
  );

  // Filter members by name/email and role
  const filteredMembers = members.filter((member) => {
    const nameMatch =
      member.user.name.toLowerCase().includes(search.toLowerCase()) ||
      member.user.email.toLowerCase().includes(search.toLowerCase());
    const roleMatch = filterRole === "all" || member.role === filterRole;
    return nameMatch && roleMatch;
  });

  // Current user role checks
  const userRole = currentMember?.role?.toLowerCase() || "";
  const isOwnerOrManager = ["owner", "manager"].includes(userRole);

  // --- 4) Invitations
  async function handleInvite(e) {
    e.preventDefault();
    setInviteMessage("");
    setInviteError("");

    if (!organization?.id) {
      setInviteError("Organization not loaded. Please refresh.");
      return;
    }

    try {
      const res = await authClient.organization.inviteMember({
        email: inviteEmail,
        role: inviteRole,
        organizationId: organization.id,
      });
      if (res.error) {
        throw new Error(res.error.message || "Failed to send invitation");
      }
      setInviteMessage("Invitation sent successfully");
      setInviteEmail("");

      // Re-fetch updated org data
      await refetchOrgData();
    } catch (err) {
      setInviteError(err.message);
    }
  }

  // Simple helper to refresh org data from the server (now that it's active)
  async function refetchOrgData() {
    try {
      const updated = await authClient.organization.getFullOrganization(); // active org
      if (!updated.error && updated.data) {
        setOrganization(updated.data);
      }
    } catch (err) {
      console.error("Refetch error:", err);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: organization.id,
      });
      setInviteMessage("Member removed successfully");
      refetchOrgData();
    } catch (err) {
      setInviteError("Failed to remove member: " + err.message);
    }
  }

  async function handleCancelInvitation(invitationId) {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;
    try {
      await authClient.organization.cancelInvitation({
        invitationId,
      });
      setInviteMessage("Invitation canceled successfully");
      refetchOrgData();
    } catch (err) {
      setInviteError("Failed to cancel invitation: " + err.message);
    }
  }

  async function handleUpdateRole(memberId, newRole) {
    // Prevent self-role change
    if (memberId === currentMember?.id) {
      setInviteError("You cannot change your own role.");
      return;
    }
    try {
      await authClient.organization.updateMemberRole({
        memberId,
        role: newRole,
      });
      setInviteMessage("Role updated successfully");
      refetchOrgData();
    } catch (err) {
      setInviteError("Failed to update role: " + err.message);
    }
  }

  // --- 5) Render
  return (
    <div className="p-4 sm:mx-auto sm:max-w-6xl py-8">
      <h3 className="text-tremor-title font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">
        {organization.name}
        <span className="ml-2 text-sm text-gray-500">({organization.id})</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(organization.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
          }}
          className="ml-2 text-gray-500 hover:text-gray-700"
          title="Copy ID to clipboard"
        >
          <Copy size={16} />
        </button>
        {copied && <span className="ml-2 text-green-500 text-sm">Copied!</span>}
      </h3>
      <p className="mt-2 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
        Manage your organization members and invitations.
      </p>

      {/* -- Invitation Form -- */}
      <h4 className="mt-8 font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
        Invite new users
      </h4>
      <form onSubmit={handleInvite} className="mt-6 sm:flex sm:items-center sm:space-x-2">
        <div className="w-full sm:w-1/4">
          <Select
            value={inviteRole}
            onValueChange={setInviteRole}
            className="select-role"
            enableClear={false}
          >
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.name}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="mt-2 flex w-full items-center space-x-2 sm:mt-0">
          <TextInput
            placeholder="Add email..."
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="w-full rounded-tremor-small border"
          />
          <button
            type="submit"
            className="rounded-tremor-small border bg-black text-white px-4 py-2 font-medium hover:opacity-90"
          >
            Invite
          </button>
        </div>
      </form>
      {inviteMessage && <p className="mt-2 text-green-600 text-sm">{inviteMessage}</p>}
      {inviteError && <p className="mt-2 text-red-600 text-sm">{inviteError}</p>}

      <Divider className="my-10" />
      <TabGroup className="mt-6">
        <TabList>
          <Tab>Existing users</Tab>
          <Tab>Pending invitations</Tab>
        </TabList>
        <TabPanels>
          {/* --- Members Tab --- */}
          <TabPanel>
            <div className="mt-4 sm:flex sm:items-center sm:space-x-2">
              <TextInput
                placeholder="Search users..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-tremor-small"
              />
              <div className="mt-2 sm:mt-0 sm:w-fit">
                <Select
                  value={filterRole}
                  onValueChange={setFilterRole}
                  className="[&>button]:rounded-tremor-small"
                  enableClear={false}
                >
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
            <Table className="mt-3">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Member</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>
                    <span className="sr-only">Actions</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.user.name}</TableCell>
                      <TableCell>{member.user.email}</TableCell>
                      <TableCell>
                        {isOwnerOrManager &&
                        member.id !== currentMember?.id &&
                        canUpdateRole ? (
                          <Select
                            value={member.role}
                            onValueChange={(newRole) =>
                              handleUpdateRole(member.id, newRole)
                            }
                          >
                            {availableRoles.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </Select>
                        ) : (
                          member.role
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canRemoveMember && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="font-medium text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabPanel>
          {/* --- Invitations Tab --- */}
          <TabPanel>
            <Table className="mt-3">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>
                    <span className="sr-only">Actions</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingInvitations.length > 0 ? (
                  pendingInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>{inv.role}</TableCell>
                      <TableCell className="text-right">
                        {canCancelInvitation && (
                          <button
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="font-medium text-red-500 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No pending invitations
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
