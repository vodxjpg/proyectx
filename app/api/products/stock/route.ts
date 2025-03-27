// /home/zodx/Desktop/proyectx/app/api/products/stock/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/utils/auth';
import { db } from '@/utils/db';

async function getOrgIdOrThrow(req: NextRequest) {
  const sessionResponse = await auth.api.getSession({ headers: req.headers });
  if (!sessionResponse || !sessionResponse.session) {
    throw new Error('Unauthorized');
  }
  const activeOrgId = sessionResponse.session.activeOrganizationId;
  if (!activeOrgId) throw new Error('No active organization in session');
  return activeOrgId;
}

// POST: Set stock for a variant in a specific country
export async function POST(req: NextRequest) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const { variantId, countryCode, stockLevel, visibility, manageStock, allowBackorder } =
      await req.json();

    if (!variantId || !countryCode) {
      return NextResponse.json(
        { error: 'variantId and countryCode are required' },
        { status: 400 }
      );
    }

    // If manageStock is false => infinite
    const finalStockLevel = manageStock ? stockLevel || 0 : 999999999;

    const newId = crypto.randomUUID();
    const stock = await db
      .insertInto('product_stock')
      .values({
        id: newId,
        variantId,
        countryCode,
        stockLevel: finalStockLevel,
        visibility: visibility ? 1 : 0,
        manageStock: manageStock ? 1 : 0,
        allowBackorder: allowBackorder ? 1 : 0,
        organizationId,
      })
      .onConflict((oc) =>
        oc.columns(['variantId', 'countryCode']).doUpdateSet({
          stockLevel: finalStockLevel,
          visibility: visibility ? 1 : 0,
          manageStock: manageStock ? 1 : 0,
          allowBackorder: allowBackorder ? 1 : 0,
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return NextResponse.json(stock, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 400 }
    );
  }
}

// GET: Fetch stock for a variant
export async function GET(req: NextRequest) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get('variantId');

    if (!variantId) {
      return NextResponse.json({ error: 'variantId is required' }, { status: 400 });
    }

    const stock = await db
      .selectFrom('product_stock')
      .selectAll()
      .where('variantId', '=', variantId)
      .where('organizationId', '=', organizationId)
      .execute();

    return NextResponse.json(stock);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 400 }
    );
  }
}
