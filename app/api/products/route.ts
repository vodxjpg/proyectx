import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/utils/auth';
import { db } from '@/utils/db';

/** Helper to get organization ID from session */
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
 * GET /api/products
 *
 * Behavior:
 *  - If no query params: returns all parent products (simple or variable) with:
 *      id, name, sku, type, imageURL, categories[], plus an "aggregatedStock" summary
 *      (totalStock), and for variable products: variableMinPrice & variableMaxPrice
 *
 *  - If query param ?id=xxx or ?sku=xxx: returns details for that single product,
 *      including:
 *        - product-level fields
 *        - categories
 *        - an array of all variants (for variable), each with stock lines
 *        - or the single variant + stock lines (for simple)
 */
export async function GET(req: NextRequest) {
  try {
    const organizationId = await getOrgIdOrThrow(req);

    // Extract search params: ?id=xxx or ?sku=xxx
    const { searchParams } = new URL(req.url);
    const paramId = searchParams.get('id');
    const paramSku = searchParams.get('sku');

    // If user provided ?id or ?sku, we do "getOneProductDetail"
    if (paramId || paramSku) {
      return await getOneProductDetail(organizationId, paramId, paramSku);
    }

    // Otherwise, we return the entire list of parent products with partial details
    return await getAllParentProducts(organizationId);

  } catch (error: any) {
    console.error('[GET] /api/products Error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 400 },
    );
  }
}

/** =========================================
 *  getAllParentProducts(organizationId)
 *    Returns an array of products with:
 *      - product fields: id, name, type, sku, imageURL, ...
 *      - categories[] array
 *      - totalStock (sum of all variant stock)
 *      - variableMinPrice & variableMaxPrice for variable products
 * =========================================*/
async function getAllParentProducts(organizationId: string) {
  // 1) Fetch the parent products
  const products = await db
    .selectFrom('product as p')
    .select([
      'p.id',
      'p.name',
      'p.type',
      'p.sku',
      'p.price',
      'p.status',
      'p.imageURL',
      'p.createdAt',
      'p.updatedAt',
    ])
    .where('p.organizationId', '=', organizationId)
    .orderBy('p.createdAt', 'desc')
    .execute();

  const productIds = products.map((p) => p.id);

  // 2) Fetch all category assignments in bulk
  //    We then group by productId
  const categoryAssignments = await db
    .selectFrom('product_category_assignments as pca')
    .innerJoin('product_categories as c', 'c.id', 'pca.categoryId')
    .select([
      'pca.productId',
      'c.id as categoryId',
      'c.name as categoryName',
      'c.parentId as categoryParent',
    ])
    .where('pca.organizationId', '=', organizationId)
    .where('pca.productId', 'in', productIds)
    .execute();

  const categoriesByProductId: Record<string, { categoryId: string; categoryName: string; categoryParent: string | null }[]> = {};
  for (const ca of categoryAssignments) {
    if (!categoriesByProductId[ca.productId]) {
      categoriesByProductId[ca.productId] = [];
    }
    categoriesByProductId[ca.productId].push({
      categoryId: ca.categoryId,
      categoryName: ca.categoryName,
      categoryParent: ca.categoryParent,
    });
  }

  // 3) For each product, we want an aggregated stock approach
  //    We'll fetch from product_variants => product_stock
  //    Summing all stock if it's variable, or just the single variant if simple
  //    Then group by productId
  const variantRows = await db
    .selectFrom('product_variants as pv')
    .leftJoin('product_stock as ps', 'ps.variantId', 'pv.id')
    .select([
      'pv.productId',
      'pv.id as variantId',
      'pv.sku as variantSku',
      'pv.price as variantPrice',
      'ps.stockLevel',
      'ps.visibility',
      'ps.manageStock',
      'ps.allowBackorder',
    ])
    .where('pv.organizationId', '=', organizationId)
    .where('pv.productId', 'in', productIds)
    .execute();

  // We'll accumulate totalStock per product, and also track
  // min/max variant price for variable products
  const aggregatedStockByProductId: Record<string, number> = {};
  // minPrice / maxPrice for variable
  const minPriceByProductId: Record<string, number> = {};
  const maxPriceByProductId: Record<string, number> = {};

  for (const vr of variantRows) {
    const pid = vr.productId;
    if (!aggregatedStockByProductId[pid]) {
      aggregatedStockByProductId[pid] = 0;
    }
    aggregatedStockByProductId[pid] += vr.stockLevel || 0;

    // For variable min/max, we check variantPrice
    // We'll just always track min/max for every variant,
    // though for simple products there's only 1 variant anyway
    const vPrice = vr.variantPrice || 0;
    if (minPriceByProductId[pid] === undefined) {
      minPriceByProductId[pid] = vPrice;
      maxPriceByProductId[pid] = vPrice;
    } else {
      if (vPrice < minPriceByProductId[pid]) {
        minPriceByProductId[pid] = vPrice;
      }
      if (vPrice > maxPriceByProductId[pid]) {
        maxPriceByProductId[pid] = vPrice;
      }
    }
  }

  // 4) Construct final array of product data
  const final = products.map((p) => {
    const totalStock = aggregatedStockByProductId[p.id] || 0;
    const cats = categoriesByProductId[p.id] || [];

    // If this is a variable product, we put
    //   variableMinPrice, variableMaxPrice
    //   otherwise for simple we have p.price
    let variableMinPrice = null;
    let variableMaxPrice = null;
    if (p.type === 'variable') {
      // fallback if no variants => 0
      variableMinPrice = minPriceByProductId[p.id] || 0;
      variableMaxPrice = maxPriceByProductId[p.id] || 0;
    }

    return {
      id: p.id,
      name: p.name,
      type: p.type,
      sku: p.sku,
      status: p.status,
      imageURL: p.imageURL,
      // For simple products, 'price' is stored on p.price
      // For variable, we do min/max
      price: p.price,
      variableMinPrice,
      variableMaxPrice,
      totalStock,
      categories: cats,
    };
  });

  return NextResponse.json(final, { status: 200 });
}

/** =========================================
 *  getOneProductDetail(organizationId, id?, sku?)
 *    Returns a single product *with all details*:
 *      - product fields
 *      - categories
 *      - an array of variants (even for simple => 1 variant)
 *        each variant has stock lines
 * =========================================*/
async function getOneProductDetail(
  organizationId: string,
  productId: string | null,
  productSku: string | null,
) {
  // 1) Find the product row by ID or SKU
  let product: any;
  if (productId) {
    product = await db
      .selectFrom('product')
      .selectAll()
      .where('organizationId', '=', organizationId)
      .where('id', '=', productId)
      .executeTakeFirst();
  } else if (productSku) {
    product = await db
      .selectFrom('product')
      .selectAll()
      .where('organizationId', '=', organizationId)
      .where('sku', '=', productSku)
      .executeTakeFirst();
  }

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const pid = product.id;

  // 2) Get categories for this product
  const categories = await db
    .selectFrom('product_category_assignments as pca')
    .innerJoin('product_categories as c', 'c.id', 'pca.categoryId')
    .select([
      'c.id as categoryId',
      'c.name as categoryName',
      'c.parentId as categoryParent',
      'c.slug as categorySlug',
    ])
    .where('pca.productId', '=', pid)
    .where('pca.organizationId', '=', organizationId)
    .execute();

  // 3) Fetch all variants for this product (including simple => 1 variant)
  const variants = await db
    .selectFrom('product_variants as pv')
    .selectAll()
    .where('pv.productId', '=', pid)
    .where('pv.organizationId', '=', organizationId)
    .execute();

  // 4) For each variant, fetch stock lines
  const variantIds = variants.map((v) => v.id);
  let allStock = [] as any[];
  if (variantIds.length > 0) {
    allStock = await db
      .selectFrom('product_stock as ps')
      .selectAll()
      .where('ps.variantId', 'in', variantIds)
      .where('ps.organizationId', '=', organizationId)
      .execute();
  }

  // Group stock by variantId
  const stockByVariantId: Record<string, any[]> = {};
  for (const s of allStock) {
    if (!stockByVariantId[s.variantId]) {
      stockByVariantId[s.variantId] = [];
    }
    stockByVariantId[s.variantId].push(s);
  }

  // 5) Combine variant + stock
  //    Also fetch variant terms if you want fully detailed attribute/term usage
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

  const termsByVariantId: Record<string, any[]> = {};
  for (const vt of variantTermsRows) {
    if (!termsByVariantId[vt.variantId]) {
      termsByVariantId[vt.variantId] = [];
    }
    termsByVariantId[vt.variantId].push({
      attributeId: vt.attributeId,
      name: vt.termName,
      slug: vt.termSlug,
    });
  }

  const variantsWithStock = variants.map((v) => ({
    ...v,
    stock: stockByVariantId[v.id] || [],
    terms: termsByVariantId[v.id] || [],
  }));

  // 6) Optionally fetch "attribute assignments" for the parent product
  const attributeAssignments = await db
    .selectFrom('product_attribute_assignments as paa')
    .innerJoin('product_attributes as pa', 'pa.id', 'paa.attributeId')
    .leftJoin('product_term as pt', (join) => {
      join
        .onRef('pt.productId', '=', 'paa.productId')
        .onRef('pt.attributeId', '=', 'paa.attributeId');
    })
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
    .where('paa.productId', '=', pid)
    .where('paa.organizationId', '=', organizationId)
    .execute();

  const attrsById: Record<string, {
    attributeId: string;
    usedForVariation: boolean;
    attributeName: string;
    attributeSlug: string;
    terms: { id: string; name: string; slug: string }[];
  }> = {};
  for (const row of attributeAssignments) {
    const aId = row.attributeId;
    if (!attrsById[aId]) {
      attrsById[aId] = {
        attributeId: aId,
        usedForVariation: !!row.usedForVariation,
        attributeName: row.attributeName!,
        attributeSlug: row.attributeSlug!,
        terms: [],
      };
    }
    if (row.termId) {
      attrsById[aId].terms.push({
        id: row.termId,
        name: row.termName!,
        slug: row.termSlug!,
      });
    }
  }
  const productAttributes = Object.values(attrsById);

  // 7) Build final single-product response
  const fullProduct = {
    ...product,
    categories,
    attributes: productAttributes,
    variants: variantsWithStock,
  };

  return NextResponse.json(fullProduct, { status: 200 });
}



export async function POST(req: NextRequest) {
  try {
    // Get organization ID from session
    const organizationId = await getOrgIdOrThrow(req);
    console.log('[POST] organizationId:', organizationId);

    // Parse incoming payload
    const {
      name,
      description,
      type, // "simple" or "variable"
      sku,
      price,
      status,
      categories,
      attributes,
      variations, // array of variation objects if variable
      stock,      // array of country-level stock if simple
      imageURL,   // <-- new parent product image
    } = await req.json();
    console.log('[POST] Received payload:', {
      name, description, type, sku, price, status,
      categories, attributes, variations, stock, imageURL
    });

    if (!name || !type || !status) {
      return NextResponse.json(
        { error: 'Name, type, and status are required' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    console.log('[POST] New product ID:', id);

    // Start transaction
    const product = await db.transaction().execute(async (trx) => {
      // 1) Insert product
      const productValues = {
        id,
        organizationId,
        name,
        description,
        type,
        // We store parent SKU only if simple,
        // but you previously changed to allow SKU for any product. If so, remove the conditional below:
        sku: type === 'simple' ? sku : sku, // or just 'sku'
        price: type === 'simple' ? price : null,
        status,
        createdAt,
        updatedAt,
        imageURL: imageURL || null, // store the parent's image (simple or variable)
      };
      console.log('[POST] Inserting product with values:', productValues);
      const insertedProduct = await trx
        .insertInto('product')
        .values(productValues)
        .returningAll()
        .executeTakeFirstOrThrow();
      console.log('[POST] Inserted product:', insertedProduct);

      // 2) Insert category assignments
      if (categories && categories.length > 0) {
        const categoryAssignments = categories.map((categoryId: string) => ({
          id: crypto.randomUUID(),
          productId: id,
          categoryId,
          organizationId,
        }));
        console.log('[POST] Inserting category assignments:', categoryAssignments);
        await trx.insertInto('product_category_assignments')
          .values(categoryAssignments)
          .execute();
      }

      // 3) Insert attribute assignments and product terms for non-variation attributes
      if (attributes && attributes.length > 0) {
        // Log a lookup for each attribute to confirm existence and organization
        for (const attr of attributes) {
          const dbAttr = await trx.selectFrom('product_attributes')
            .selectAll()
            .where('id', '=', attr.attributeId)
            .executeTakeFirst();
          console.log('[POST] Lookup attribute:', attr.attributeId, dbAttr);
          if (!dbAttr) {
            throw new Error(`Attribute ${attr.attributeId} not found in product_attributes`);
          }
          // Optional: Check if dbAttr.organizationId matches organizationId
          if (dbAttr.organizationId !== organizationId) {
            throw new Error(
              `Attribute ${attr.attributeId} organization mismatch. Expected ${organizationId} but got ${dbAttr.organizationId}`
            );
          }
        }

        const attributeAssignments = attributes.map((attr: any) => ({
          id: crypto.randomUUID(),
          productId: id,
          attributeId: attr.attributeId,
          usedForVariation: type === 'variable' && attr.usedForVariation ? 1 : 0,
          organizationId,
        }));
        console.log('[POST] Inserting attribute assignments:', attributeAssignments);
        await trx.insertInto('product_attribute_assignments')
          .values(attributeAssignments)
          .execute();

        // Insert terms for attributes not used for variation (if any)
        const terms = attributes
          .filter((attr: any) => !attr.usedForVariation || type === 'simple')
          .flatMap((attr: any) =>
            attr.terms.map((termId: string) => ({
              id: crypto.randomUUID(),
              productId: id,
              attributeId: attr.attributeId,
              termId,
              organizationId,
            }))
          );
        if (terms.length > 0) {
          console.log('[POST] Inserting product terms:', terms);
          await trx.insertInto('product_term').values(terms).execute();
        }
      }

      // 4) Insert variants (and their variant terms and stock)
      if (type === 'variable' && variations && variations.length > 0) {
        const variantInserts = variations.map((variant: any) => ({
          id: crypto.randomUUID(),
          productId: id,
          organizationId,
          sku: variant.sku, // For variable, each variant gets an SKU
          price: variant.price,
          createdAt,
          updatedAt,
          imageURL: variant.imageURL || null, // <-- new variant image
        }));
        console.log('[POST] Inserting variants:', variantInserts);
        const insertedVariants = await trx.insertInto('product_variants')
          .values(variantInserts)
          .returning(['id'])
          .execute();
        console.log('[POST] Inserted variants:', insertedVariants);

        // Insert variant terms
        const variantTerms = variations.flatMap((variant: any, index: number) =>
          variant.terms.map((term: any) => ({
            id: crypto.randomUUID(),
            variantId: insertedVariants[index].id,
            attributeId: term.attributeId,
            termId: term.termId,
            organizationId,
          }))
        );
        console.log('[POST] Prepared variant terms:', variantTerms);
        if (variantTerms.length > 0) {
          await trx.insertInto('product_variant_terms')
            .values(variantTerms)
            .execute();
          console.log('[POST] Inserted variant terms');
        }

        // Insert stock for each variation
        for (let i = 0; i < variations.length; i++) {
          const variation = variations[i];
          const variantId = insertedVariants[i].id;
          if (variation.stock && variation.stock.length > 0) {
            const stockInserts = variation.stock.map((stk: any) => ({
              id: crypto.randomUUID(),
              variantId,
              countryCode: stk.countryCode,
              stockLevel: stk.manageStock ? stk.stockLevel || 0 : 999999999,
              visibility: stk.visibility ? 1 : 0,
              manageStock: stk.manageStock ? 1 : 0,
              allowBackorder: stk.allowBackorder ? 1 : 0,
              organizationId,
            }));
            console.log(`[POST] Inserting/upserting stock for variant ${variantId}:`, stockInserts);
            for (const s of stockInserts) {
              await trx.insertInto('product_stock')
                .values(s)
                .onConflict((oc) =>
                  oc.columns(['variantId', 'countryCode']).doUpdateSet({
                    stockLevel: s.stockLevel,
                    visibility: s.visibility,
                    manageStock: s.manageStock,
                    allowBackorder: s.allowBackorder,
                  })
                )
                .execute();
            }
          }
        }
      } else {
        // SIMPLE PRODUCT => Insert a single variant
        const variantId = crypto.randomUUID();
        const simpleVariant = {
          id: variantId,
          productId: id,
          organizationId,
          sku,
          price,
          createdAt,
          updatedAt,
          imageURL: imageURL || null, // store the same image as parent if you like
        };
        console.log('[POST] Inserting simple variant:', simpleVariant);
        await trx.insertInto('product_variants')
          .values([simpleVariant])
          .execute();

        // Insert stock for simple product
        if (stock && stock.length > 0) {
          const stockInserts = stock.map((stk: any) => ({
            id: crypto.randomUUID(),
            variantId,
            countryCode: stk.countryCode,
            stockLevel: stk.manageStock ? stk.stockLevel || 0 : 999999999,
            visibility: stk.visibility ? 1 : 0,
            manageStock: stk.manageStock ? 1 : 0,
            allowBackorder: stk.allowBackorder ? 1 : 0,
            organizationId,
          }));
          console.log('[POST] Inserting/upserting stock for simple product:', stockInserts);
          for (const s of stockInserts) {
            await trx.insertInto('product_stock')
              .values(s)
              .onConflict((oc) =>
                oc.columns(['variantId', 'countryCode']).doUpdateSet({
                  stockLevel: s.stockLevel,
                  visibility: s.visibility,
                  manageStock: s.manageStock,
                  allowBackorder: s.allowBackorder,
                })
              )
              .execute();
          }
        }
      }

      return insertedProduct;
    });

    console.log('[POST] Transaction complete. Inserted product:', product);
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('[POST] Error:', error.message, error);
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 400 }
    );
  }
}
