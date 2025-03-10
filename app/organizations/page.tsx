"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { authClient } from "@/utils/auth-client";
import Link from "next/link";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
} from "@tremor/react";
import OrganizationForm from "@/components/layout/OrganizationForm";

export default function OrganizationsPage() {
  // State to hold organizations and UI states
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);

  // 1) Fetch organizations once on mount
  useEffect(() => {
    let mounted = true;

    async function fetchOrgs() {
      try {
        const res = await authClient.organization.list();
        if (!mounted) return;
        if (res.error) {
          throw new Error(res.error.message || "Failed to load organizations");
        }
        setOrganizations(res.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();

    return () => {
      mounted = false;
    };
  }, []);

  // Helper to re-fetch after add/update/delete
  async function refetchOrganizations() {
    setLoading(true);
    try {
      const res = await authClient.organization.list();
      if (res.error) throw new Error(res.error.message);
      setOrganizations(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // === Handlers for adding/editing organizations ===
  const handleAddOrganization = () => {
    setEditingOrg(null);
    setIsModalOpen(true);
  };

  const handleEditOrganization = (org) => {
    setEditingOrg(org);
    setIsModalOpen(true);
  };

  // Called after form success (create or update)
  const handleFormSuccess = () => {
    setIsModalOpen(false);
    refetchOrganizations();
  };

  // === Handler for deleting an organization ===
  const handleDeleteOrganization = async (orgId) => {
    if (!confirm("Are you sure you want to delete this organization?")) {
      return;
    }
    try {
      await authClient.organization.delete({ organizationId: orgId });
      // Remove it from local state or just refetch
      await refetchOrganizations();

      // Optionally set a new active org if needed
      // If you want to auto-set the first one as active:
      // if (organizations.length > 1) {
      //   const remaining = organizations.filter((o) => o.id !== orgId);
      //   await authClient.organization.setActive({ organizationId: remaining[0].id });
      // }
    } catch (err) {
      console.error("Error deleting organization:", err);
      alert("Oops, something went wrong deleting that organization!");
    }
  };

  // === UI Rendering Logic ===

  if (loading) {
    return <div className="p-6">Loading your organizations...</div>;
  }

  if (error) {
    return <div className="p-6">Sorry, there was an error: {error}</div>;
  }

  return (
    <div className="mt-8 px-6 py-6">
      <div className="sm:flex sm:items-center sm:justify-between sm:space-x-10">
        <div>
          <h3 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
            Organizations
          </h3>
          <p className="mt-1 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
            See and manage all your organizations here.
          </p>
        </div>
        <Button
          onClick={handleAddOrganization}
          className="mt-4 w-full sm:mt-0 sm:w-auto"
        >
          Add Organization
        </Button>
      </div>

      <Table className="mt-8">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Slug</TableHeaderCell>
            <TableHeaderCell className="text-right">Created At</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {organizations && organizations.length > 0 ? (
            organizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <Link
                    href={`/organizations/${org.slug}`}
                    className="text-tremor-brand hover:underline"
                  >
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell>{org.slug}</TableCell>
                <TableCell className="text-right">
                  {new Date(org.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    onClick={() => handleEditOrganization(org)}
                    variant="light"
                    className="mr-2"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteOrganization(org.id)}
                    variant="light"
                    color="red"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4}>No organizations found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <OrganizationForm
              existingId={editingOrg?.id}
              existingName={editingOrg?.name}
              existingSlug={editingOrg?.slug}
              onSuccess={handleFormSuccess}
            />
            <Button onClick={() => setIsModalOpen(false)} className="mt-4 w-full">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
