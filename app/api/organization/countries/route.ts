// /home/zodx/Desktop/proyectx/app/api/organization/countries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/utils/auth'; // Your Better Auth setup
import { db } from '@/utils/db'; // Your Kysely database instance

export async function GET(req: NextRequest) {
  try {
    // Get session and active organization ID using Better Auth
    const sessionResponse = await auth.api.getSession({ headers: req.headers });
    if (!sessionResponse?.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const activeOrgId = sessionResponse.session.activeOrganizationId;
    if (!activeOrgId) {
      return NextResponse.json({ error: 'No active organization selected' }, { status: 400 });
    }

    // Query organization_countries for the active organization
    const countries = await db
      .selectFrom('organization_countries')
      .select('countryCode')
      .where('organizationId', '=', activeOrgId)
      .execute();

    // Return array of country objects
    const countryList = countries.map((row) => ({ countryCode: row.countryCode }));
    return NextResponse.json(countryList);
  } catch (error) {
    console.error('Error fetching organization countries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}