"use client";
import React, { useEffect, useState } from "react";
import { authClient } from "@/utils/auth-client";
import { DataTable } from "@/components/ui/DataTable";
import { getOrganizationColumns } from "@/components/layout/OrganizationColumns";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Button } from "@/components/ui/Button";
import OrganizationForm from "@/components/layout/OrganizationForm";
import { Row } from "@tanstack/react-table";

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

// Extra detail for editing
interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  supportEmail: string;
  countries: string[];
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // We'll store minimal info from the table
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // We'll store the extra detail from GET /api/organization/[id]
  const [editingOrgDetails, setEditingOrgDetails] = useState<OrganizationDetails | null>(null);

  // ------------------- Fetch list of orgs -------------------
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
      } catch (err: any) {
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

  // Refresh the list, used after we create/update
  const refetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await authClient.organization.list();
      if (res.error) throw new Error(res.error.message);
      setOrganizations(res.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ------------------- Create new org -----------------------
  const handleAddOrganization = () => {
    // Creating => no existing org
    setEditingOrg(null);
    setEditingOrgDetails(null);
    setIsDrawerOpen(true);
  };

  // ------------------- Edit existing org ---------------------
  const handleEditOrganization = async (org: Organization) => {
    try {
      // 1) Pre-fetch the details from our custom route
      const res = await fetch(`/api/organization/${org.id}`, { method: "GET" });
      if (!res.ok) {
        throw new Error("Failed to fetch organization details");
      }
      const details = (await res.json()) as OrganizationDetails;

      // 2) Now that we have the data, set the states
      setEditingOrg(org);         // minimal info (id, name, slug)
      setEditingOrgDetails(details); // includes supportEmail, countries

      // 3) Open the drawer AFTER we have the details
      setIsDrawerOpen(true);

    } catch (err) {
      console.error("Error fetching org details:", err);
      alert("Failed to load organization details");
    }
  };

  // ------------------- Delete single org ---------------------
  const handleDeleteOrganization = async () => {
    if (!editingOrg) return;
    if (!confirm("Are you sure you want to delete this organization?")) return;
    try {
      await authClient.organization.delete({ organizationId: editingOrg.id });
      refetchOrganizations();
      setIsDrawerOpen(false);
    } catch (err) {
      console.error("Error deleting organization:", err);
      alert("Oops, something went wrong deleting that organization!");
    }
  };

  // ------------------- Bulk delete from table ----------------
  const handleBulkDelete = async (selectedRows: Row<Organization>[]) => {
    if (!confirm(`Are you sure you want to delete ${selectedRows.length} organizations?`)) {
      return;
    }
    try {
      const ids = selectedRows.map((row) => row.original.id);
      await Promise.all(
        ids.map((id) => authClient.organization.delete({ organizationId: id }))
      );
      refetchOrganizations();
    } catch (err) {
      console.error("Error deleting organizations:", err);
      alert("Oops, something went wrong deleting the selected organizations!");
    }
  };

  // When the form finishes saving
  const handleFormSuccess = () => {
    setIsDrawerOpen(false);
    refetchOrganizations();
  };

  // If user clicks row, do nothing special (maybe navigate to detail page)
  const handleRowClick = (row: Row<Organization>) => {
    // ...
  };

  const columns = getOrganizationColumns({
    onEditClick: handleEditOrganization,
  });

  // ------------------- Render the page -----------------------
  if (loading) {
    return <div className="p-6">Loading your organizations...</div>;
  }
  if (error) {
    return <div className="p-6">Sorry, there was an error: {error}</div>;
  }

  return (
    <div className="p-4 sm:mx-auto sm:max-w-6xl py-8">
      <div className="sm:flex sm:items-center sm:justify-between sm:space-x-10 my-4">
        <div>
          <h3 className="font-semibold">
            Organizations
          </h3>
          <p className="mt-1 text-gray-700">
            See and manage all your organizations here.
          </p>
        </div>
        <Button onClick={handleAddOrganization} className="my-4 w-full sm:mt-0 sm:w-auto">
          Add Organization
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={organizations}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
      />

      <FormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title={editingOrg ? "Edit Organization" : "Add Organization"}
        onDelete={editingOrg ? handleDeleteOrganization : undefined}
      >
        {/*
          If we have editingOrgDetails, we pass that along to the form.
          If we're creating, there's no details => pass empty.
          If the data is not yet fetched, you might show a spinner or an empty form.
        */}
        {editingOrg ? (
          editingOrgDetails ? (
            <OrganizationForm
              // basic fields
              existingId={editingOrgDetails.id}
              existingName={editingOrgDetails.name}
              existingSlug={editingOrgDetails.slug}
              // advanced fields
              existingSupportEmail={editingOrgDetails.supportEmail}
              existingCountries={editingOrgDetails.countries}
              onSuccess={handleFormSuccess}
            />
          ) : (
            <div>Loading organization details...</div>
          )
        ) : (
          // Creating new => no existing org details
          <OrganizationForm onSuccess={handleFormSuccess} />
        )}
      </FormDrawer>
    </div>
  );
}
