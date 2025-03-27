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


/** 
 * GET /api/products/[productId]
 *  Returns the single product with all variants, stock, categories, etc.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const productId = params.productId;

    // Load the product from DB
    const product = await db
      .selectFrom('product')
      .selectAll()
      .where('id', '=', productId)
      .where('organizationId', '=', organizationId)
      .executeTakeFirst();
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Load categories
    const categories = await db
      .selectFrom('product_category_assignments as pca')
      .innerJoin('product_categories as c', 'c.id', 'pca.categoryId')
      .select(['c.id as categoryId', 'c.name as categoryName', 'c.parentId as categoryParent'])
      .where('pca.productId', '=', productId)
      .where('pca.organizationId', '=', organizationId)
      .execute();

    // Load variants
    const variants = await db
      .selectFrom('product_variants as pv')
      .selectAll()
      .where('pv.productId', '=', productId)
      .where('pv.organizationId', '=', organizationId)
      .execute();

    // For each variant, load stock
    const variantIds = variants.map((v) => v.id);
    let allStock = [];
    if (variantIds.length > 0) {
      allStock = await db
        .selectFrom('product_stock as ps')
        .selectAll()
        .where('ps.variantId', 'in', variantIds)
        .where('ps.organizationId', '=', organizationId)
        .execute();
    }
    // group stock by variantId
    const stockByVariantId: Record<string, any[]> = {};
    for (const s of allStock) {
      if (!stockByVariantId[s.variantId]) {
        stockByVariantId[s.variantId] = [];
      }
      stockByVariantId[s.variantId].push(s);
    }

    // For each variant, load variant terms
    const variantTermsRows = await db
      .selectFrom('product_variant_terms as pvt')
      .innerJoin('product_attribute_terms as pat', 'pat.id', 'pvt.termId')
      .select([
        'pvt.variantId',
        'pat.attributeId',
        'pat.name as termName',
        'pat.slug as termSlug',
      ])
      .where('pvt.variantId', 'in', variantIds)
      .where('pvt.organizationId', '=', organizationId)
      .execute();
    // group them
    const termsByVariantId: Record<string, any[]> = {};
    for (const vt of variantTermsRows) {
      if (!termsByVariantId[vt.variantId]) {
        termsByVariantId[vt.variantId] = [];
      }
      termsByVariantId[vt.variantId].push({
        attributeId: vt.attributeId,
        termId: vt.termSlug, // or store vt.termId
        name: vt.termName,
      });
    }

    const variantsWithStock = variants.map((v) => ({
      ...v,
      stock: stockByVariantId[v.id] || [],
      terms: termsByVariantId[v.id] || [],
    }));

    // Also load product attributes & terms for the parent
    const attributeAssignments = await db
      .selectFrom('product_attribute_assignments as paa')
      .innerJoin('product_attributes as pa', 'pa.id', 'paa.attributeId')
      .leftJoin('product_term as pt', (join) =>
        join
          .onRef('pt.productId', '=', 'paa.productId')
          .onRef('pt.attributeId', '=', 'paa.attributeId')
      )
      .leftJoin('product_attribute_terms as pat2', 'pat2.id', 'pt.termId')
      .select([
        'paa.attributeId',
        'paa.usedForVariation',
        'pa.name as attributeName',
        'pa.slug as attributeSlug',
        'pat2.id as termId',
        'pat2.name as termName',
        'pat2.slug as termSlug',
      ])
      .where('paa.productId', '=', productId)
      .where('paa.organizationId', '=', organizationId)
      .execute();

    const attrsById: Record<string, any> = {};
    for (const row of attributeAssignments) {
      if (!attrsById[row.attributeId]) {
        attrsById[row.attributeId] = {
          attributeId: row.attributeId,
          usedForVariation: !!row.usedForVariation,
          attributeName: row.attributeName,
          attributeSlug: row.attributeSlug,
          terms: [],
        };
      }
      if (row.termId) {
        attrsById[row.attributeId].terms.push({
          id: row.termId,
          name: row.termName,
          slug: row.termSlug,
        });
      }
    }
    const productAttributes = Object.values(attrsById);

    const fullProduct = {
      ...product,
      categories,
      attributes: productAttributes,
      variants: variantsWithStock,
    };

    return NextResponse.json(fullProduct, { status: 200 });
  } catch (error: any) {
    console.error('[GET] /api/products/[productId] error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 400 }
    );
  }
}

/**
 * DELETE /api/products/[productId]
 *   - Removes all references (variants, stock, terms, etc.)
 *   - Then deletes the product row itself
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const productId = params.productId;
    console.log('[DELETE] productId:', productId, 'org:', organizationId);

    // Transaction
    await db.transaction().execute(async (trx) => {
      // 1) Check if product exists
      const product = await trx
        .selectFrom('product')
        .selectAll()
        .where('id', '=', productId)
        .where('organizationId', '=', organizationId)
        .executeTakeFirst();

      if (!product) {
        throw new Error('Product not found or not in this organization');
      }

      // 2) Delete product_category_assignments
      await trx
        .deleteFrom('product_category_assignments')
        .where('productId', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();

      // 3) Delete product_attribute_assignments
      await trx
        .deleteFrom('product_attribute_assignments')
        .where('productId', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();

      // 4) Delete product_terms
      await trx
        .deleteFrom('product_term')
        .where('productId', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();

      // 5) Delete variants => but first variant-terms, stock
      const variants = await trx
        .selectFrom('product_variants')
        .select(['id'])
        .where('productId', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();

      const variantIds = variants.map((v) => v.id);

      if (variantIds.length > 0) {
        // 5A) delete product_variant_terms
        await trx
          .deleteFrom('product_variant_terms')
          .where('variantId', 'in', variantIds)
          .where('organizationId', '=', organizationId)
          .execute();

        // 5B) delete product_stock
        await trx
          .deleteFrom('product_stock')
          .where('variantId', 'in', variantIds)
          .where('organizationId', '=', organizationId)
          .execute();

        // 5C) delete product_variants
        await trx
          .deleteFrom('product_variants')
          .where('id', 'in', variantIds)
          .where('organizationId', '=', organizationId)
          .execute();
      }

      // 6) Finally delete the product
      await trx
        .deleteFrom('product')
        .where('id', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[DELETE] product error:', error.message);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PUT: Update a product by ID
export async function PUT(req: NextRequest, { params }: any) {
  try {
    const productId = params.productId;
    const organizationId = await getOrgIdOrThrow(req);

    const {
      name,
      description,
      type,
      sku,
      price,
      status,
      categories,
      attributes,
      variations,
      stock,
      imageURL, // new parent product image
    } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'No product ID provided' }, { status: 400 });
    }

    // Transaction
    await db.transaction().execute(async (trx) => {
      // 1) Update the main product row
      const updatedAt = new Date().toISOString();

      await trx
        .updateTable('product')
        .set({
          name,
          description,
          type,
          sku,
          price: type === 'simple' ? price : null,
          status,
          updatedAt,
          imageURL: imageURL || null, // update parent's image
        })
        .where('id', '=', productId)
        .where('organizationId', '=', organizationId)
        .executeTakeFirst();

      // 2) Re-do categories
      await trx
        .deleteFrom('product_category_assignments')
        .where('productId', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();

      if (categories && categories.length > 0) {
        const catInserts = categories.map((catId: string) => ({
          id: crypto.randomUUID(),
          productId,
          categoryId: catId,
          organizationId,
        }));
        await trx.insertInto('product_category_assignments').values(catInserts).execute();
      }

      // 3) Re-do attributes
      await trx
        .deleteFrom('product_attribute_assignments')
        .where('productId', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();

      await trx
        .deleteFrom('product_terms')
        .where('productId', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();

      if (attributes && attributes.length > 0) {
        const attributeAssignments = attributes.map((attr: any) => ({
          id: crypto.randomUUID(),
          productId,
          attributeId: attr.attributeId,
          usedForVariation: type === 'variable' && attr.usedForVariation ? 1 : 0,
          organizationId,
        }));
        await trx.insertInto('product_attribute_assignments').values(attributeAssignments).execute();

        // Insert terms for non-variation attributes
        const terms = attributes
          .filter((attr: any) => !attr.usedForVariation || type === 'simple')
          .flatMap((attr: any) =>
            attr.terms.map((termId: string) => ({
              id: crypto.randomUUID(),
              productId,
              attributeId: attr.attributeId,
              termId,
              organizationId,
            }))
          );

        if (terms.length > 0) {
          await trx.insertInto('product_terms').values(terms).execute();
        }
      }

      // 4) Re-do variants
      const oldVariants = await trx
        .selectFrom('product_variants')
        .selectAll()
        .where('productId', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();

      for (const ov of oldVariants) {
        await trx
          .deleteFrom('product_variant_terms')
          .where('variantId', '=', ov.id)
          .where('organizationId', '=', organizationId)
          .execute();
        await trx
          .deleteFrom('product_stock')
          .where('variantId', '=', ov.id)
          .where('organizationId', '=', organizationId)
          .execute();
      }

      await trx
        .deleteFrom('product_variants')
        .where('productId', '=', productId)
        .where('organizationId', '=', organizationId)
        .execute();

      // Re-insert new variants
      if (type === 'variable' && variations && variations.length > 0) {
        const variantInserts = variations.map(() => ({
          id: crypto.randomUUID(),
          productId,
          organizationId,
          sku: '',   
          price: 0,  
          createdAt: new Date().toISOString(),
          updatedAt,
          imageURL: null, // will fill below
        }));

        // Insert them
        const inserted = await trx
          .insertInto('product_variants')
          .values(variantInserts)
          .returning(['id'])
          .execute();

        // For each inserted variant, update fields
        for (let i = 0; i < inserted.length; i++) {
          const variantId = inserted[i].id;
          const vData = variations[i];

          await trx
            .updateTable('product_variants')
            .set({
              sku: vData.sku,
              price: vData.price,
              imageURL: vData.imageURL || null, // <-- variant image
            })
            .where('id', '=', variantId)
            .execute();

          // insert variant terms
          if (vData.terms && vData.terms.length > 0) {
            const vTerms = vData.terms.map((t: any) => ({
              id: crypto.randomUUID(),
              variantId,
              attributeId: t.attributeId,
              termId: t.termId,
              organizationId,
            }));
            await trx.insertInto('product_variant_terms').values(vTerms).execute();
          }

          // insert stock for each country
          if (vData.stock && vData.stock.length > 0) {
            for (const s of vData.stock) {
              await trx
                .insertInto('product_stock')
                .values({
                  id: crypto.randomUUID(),
                  variantId,
                  countryCode: s.countryCode,
                  stockLevel: s.manageStock ? s.stockLevel || 0 : 999999999,
                  visibility: s.visibility ? 1 : 0,
                  manageStock: s.manageStock ? 1 : 0,
                  allowBackorder: s.allowBackorder ? 1 : 0,
                  organizationId,
                })
                .onConflict((oc) =>
                  oc.columns(['variantId', 'countryCode']).doUpdateSet({
                    stockLevel: s.stockLevel,
                    visibility: s.visibility ? 1 : 0,
                    manageStock: s.manageStock ? 1 : 0,
                    allowBackorder: s.allowBackorder ? 1 : 0,
                  })
                )
                .execute();
            }
          }
        }
      } else {
        // SIMPLE
        const variantId = crypto.randomUUID();
        await trx
          .insertInto('product_variants')
          .values({
            id: variantId,
            productId,
            organizationId,
            sku,
            price,
            createdAt: new Date().toISOString(),
            updatedAt,
            imageURL: imageURL || null,
          })
          .execute();

        // Insert stock for simple product
        if (stock && stock.length > 0) {
          for (const s of stock) {
            await trx
              .insertInto('product_stock')
              .values({
                id: crypto.randomUUID(),
                variantId,
                countryCode: s.countryCode,
                stockLevel: s.manageStock ? s.stockLevel || 0 : 999999999,
                visibility: s.visibility ? 1 : 0,
                manageStock: s.manageStock ? 1 : 0,
                allowBackorder: s.allowBackorder ? 1 : 0,
                organizationId,
              })
              .onConflict((oc) =>
                oc.columns(['variantId', 'countryCode']).doUpdateSet({
                  stockLevel: s.stockLevel,
                  visibility: s.visibility ? 1 : 0,
                  manageStock: s.manageStock ? 1 : 0,
                  allowBackorder: s.allowBackorder ? 1 : 0,
                })
              )
              .execute();
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
