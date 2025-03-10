// /components/OrganizationForm.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { authClient } from '@/utils/auth-client';
import { Button } from '@tremor/react';

// Turns text into a slug, e.g., "My Org" -> "my-org"
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function OrganizationForm({
  existingId = '', // Add this so we know which org to update
  existingName = '',
  existingSlug = '',
  onSuccess,
}) {
  const [name, setName] = useState(existingName);
  const [slug, setSlug] = useState(existingSlug);
  const [slugEdited, setSlugEdited] = useState(false); // Tracks if user changed slug manually
  const [slugError, setSlugError] = useState('');
  const [isSlugAvailable, setIsSlugAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef(null);

  // Auto-update slug when name changes, unless user edited it manually
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  // Check if slug is taken whenever it changes
  useEffect(() => {
    if (!slug) {
      setIsSlugAvailable(null);
      setSlugError('');
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/onboarding/organization/slug-check?slug=${slug}`);
        const { exists } = await response.json();
        if (exists && slug !== existingSlug) {
          setIsSlugAvailable(false);
          setSlugError('This slug is already taken. Try another or use Suggest.');
        } else {
          setIsSlugAvailable(true);
          setSlugError('');
        }
      } catch (error) {
        console.error('Error checking slug:', error);
      }
    }, 500); // Wait 0.5 seconds before checking

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [slug, existingSlug]);

  // Save the organization (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !slug || slugError || isSlugAvailable === false) {
      return;
    }
    setLoading(true);
    try {
      if (existingId) {
        // Update existing organization
        await authClient.organization.update({
          organizationId: existingId,
          data: { name, slug },
        });
      } else {
        // Create new organization
        await authClient.organization.create({ name, slug });
      }
      if (onSuccess) {
        onSuccess(); // Close the popup
      }
    } catch (error) {
      alert('Something went wrong saving your organization!');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Suggest a new slug by adding a random number
  const handleSuggestSlug = () => {
    const randomNum = Math.floor(Math.random() * 1000);
    setSlug(`${slugify(name)}-${randomNum}`);
    setSlugEdited(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Organization Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          placeholder="e.g., My Cool Company"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Slug
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setSlugEdited(true);
            }}
            className="mt-1 w-full rounded border p-2"
            placeholder="e.g., my-cool-company"
            required
          />
          <Button onClick={handleSuggestSlug} type="button">
            Suggest
          </Button>
        </div>
        {slugError && <p className="mt-1 text-sm text-red-500">{slugError}</p>}
      </div>

      <Button
        type="submit"
        disabled={loading || !name || !slug || !!slugError || isSlugAvailable === false}
        className="w-full"
      >
        {loading ? 'Saving...' : existingId ? 'Save Changes' : 'Create Organization'}
      </Button>
    </form>
  );
}