'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import useSWR from 'swr';
import {
  Divider,
  NumberInput,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  TextInput,
  Switch,
} from '@tremor/react';
import QuillEditor from '@/components/layout/EditorWrapper';
import ReactSelect from 'react-select';

// Simple fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// A single "Stock Row"
function StockRow({
  stockItem,
  onChange,
  onRemove,
  countries,
}: {
  stockItem: {
    countryCode: string;
    stockLevel: number;
    visibility: boolean;
    manageStock: boolean;
    allowBackorder: boolean;
  };
  onChange: (updates: any) => void;
  onRemove: () => void;
  countries: any[];
}) {
  const countryOptions = countries.map((c: any) => ({
    value: c.countryCode,
    label: c.countryCode,
  }));

  const selectedCountry = countryOptions.find(
    (opt) => opt.value === stockItem.countryCode
  );

  return (
    <div className="border p-4 rounded-md space-y-3">
      {/* Country + Remove */}
      <div className="flex items-center justify-between">
        <div className="w-2/5">
          <ReactSelect
            options={countryOptions}
            value={selectedCountry || null}
            onChange={(val) => {
              if (val) {
                onChange({ countryCode: val.value });
              }
            }}
            menuPortalTarget={document.body}
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            }}
            placeholder="Select Country"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:underline text-sm"
        >
          Remove
        </button>
      </div>

      {/* Manage Stock */}
      <div className="flex items-center space-x-2">
        <Switch
          checked={stockItem.manageStock}
          onChange={(checked) => onChange({ manageStock: checked })}
        />
        <label>Manage Stock</label>
      </div>

      {/* Stock Level */}
      {stockItem.manageStock && (
        <div>
          <label className="block mb-1 text-sm font-medium">Stock Level</label>
          <NumberInput
            value={stockItem.stockLevel}
            onValueChange={(val) => onChange({ stockLevel: val })}
            step={1}
            min={0}
          />
        </div>
      )}

      {/* Allow Backorder */}
      <div className="flex items-center space-x-2">
        <Switch
          checked={stockItem.allowBackorder}
          onChange={(checked) => onChange({ allowBackorder: checked })}
        />
        <label>Allow Backorders</label>
      </div>

      {/* Visibility */}
      <div className="flex items-center space-x-2">
        <Switch
          checked={stockItem.visibility}
          onChange={(checked) => onChange({ visibility: checked })}
        />
        <label>Visible in Store?</label>
      </div>
    </div>
  );
}

// TermsSelector for picking non-variation terms
function TermsSelector({
  attributeId,
  selectedTerms,
  onChange,
}: {
  attributeId: string;
  selectedTerms: string[];
  onChange: (termIds: string[]) => void;
}) {
  const { data: terms, error } = useSWR(
    `/api/products/attribute-terms?attributeId=${attributeId}`,
    fetcher
  );

  if (error) return <div>Error loading terms</div>;
  if (!terms) return <div>Loading terms...</div>;

  const options = terms.map((term: any) => ({
    value: term.id,
    label: term.name,
  }));

  const selectedOptions = options.filter((opt: any) =>
    selectedTerms.includes(opt.value)
  );

  return (
    <ReactSelect
      isMulti
      options={options}
      value={selectedOptions}
      onChange={(selected) =>
        onChange(selected ? selected.map((s: any) => s.value) : [])
      }
      className="mt-2"
      menuPortalTarget={document.body}
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      }}
    />
  );
}

// TermsOptions for Variation term dropdown
function TermsOptions({ attributeId }: { attributeId: string }) {
  const { data: terms, error } = useSWR(
    `/api/products/attribute-terms?attributeId=${attributeId}`,
    fetcher
  );

  if (error) return <option value="">Error loading terms</option>;
  if (!terms) return <option value="">Loading terms...</option>;

  return (
    <>
      {terms.map((term: any) => (
        <option key={term.id} value={term.id}>
          {term.name}
        </option>
      ))}
    </>
  );
}

// Main ProductForm
export default function ProductForm({ productId }: { productId?: string }) {
  // -- Data fetches
  const {
    data: countriesData,
    error: countriesError,
    isLoading: isCountriesLoading,
  } = useSWR('/api/organization/countries', fetcher);

  const { data: categories } = useSWR('/api/products/categories', fetcher);
  const { data: attributes } = useSWR('/api/products/attributes', fetcher);

  // -- Form State
  const [formData, setFormData] = useState<any>({
    status: 'draft',
    title: '',
    description: '',
    categories: [],
    productType: 'simple',
    sku: '',
    price: 0,
    attributes: [],
    variations: [],
    stock: [],
    imageURL: '', // parent product image
  });

  // -------------- IMAGE UPLOAD HANDLER (for parent) -------------
  const handleParentImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formDataToSend = new FormData();
    formDataToSend.append('file', file);

    try {
      const res = await fetch('/api/products/upload', {
        method: 'POST',
        body: formDataToSend,
      });
      const data = await res.json();
      if (res.ok && data.imageURL) {
        setFormData((prev: any) => ({
          ...prev,
          imageURL: data.imageURL,
        }));
      } else {
        alert(`Error uploading image: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error uploading image');
    }
  };

  // -------------- IMAGE UPLOAD HANDLER (for variants) -------------
  const handleVariantImageUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    variantIndex: number
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formDataToSend = new FormData();
    formDataToSend.append('file', file);

    try {
      const res = await fetch('/api/products/upload', {
        method: 'POST',
        body: formDataToSend,
      });
      const data = await res.json();
      if (res.ok && data.imageURL) {
        // store the image in that variant
        setFormData((prev: any) => {
          const copy = [...prev.variations];
          copy[variantIndex].imageURL = data.imageURL;
          return { ...prev, variations: copy };
        });
      } else {
        alert(`Error uploading variant image: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error uploading variant image');
    }
  };

  // -- Load existing product if editing
  useEffect(() => {
    if (!productId) return;

    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        // data.imageURL => parent's image
        setFormData((prev: any) => ({
          ...prev,
          status: data.status || 'draft',
          title: data.name || '',
          description: data.description || '',
          categories: data.categories || [],
          productType: data.type || 'simple',
          sku: data.sku || '',
          price: data.price || 0,
          attributes: (data.attributes || []).map((attr: any) => ({
            attributeId: attr.attributeId,
            name:
              attributes?.find((a: any) => a.id === attr.attributeId)?.name ||
              'Unknown',
            usedForVariation: attr.usedForVariation || false,
            terms: attr.terms || [],
          })),
          variations: (data.variations || []).map((v: any) => ({
            id: v.id,
            sku: v.sku,
            price: v.price,
            terms: v.terms || [],
            stock: v.stock || [],
            imageURL: v.imageURL || '', // load the variation's image
          })),
          stock: data.stock || [],
          imageURL: data.imageURL || '', // parent's image
        }));
      });
  }, [productId, attributes]);

  // -- Initialize stock for new product if simple
  useEffect(() => {
    if (!productId && countriesData && formData.stock.length === 0) {
      setFormData((prev: any) => ({
        ...prev,
        stock: countriesData.map((c: any) => ({
          countryCode: c.countryCode,
          stockLevel: 0,
          visibility: true,
          manageStock: true,
          allowBackorder: false,
        })),
      }));
    }
  }, [productId, countriesData, formData.stock]);

  // Switch simple <-> variable
  const handleProductTypeChange = (value: string) => {
    if (value === 'simple') {
      // If switching to simple, remove variations
      setFormData((prev: any) => ({
        ...prev,
        productType: 'simple',
        variations: [],
        stock:
          prev.stock.length > 0
            ? prev.stock
            : (countriesData || []).map((c: any) => ({
                countryCode: c.countryCode,
                stockLevel: 0,
                visibility: true,
                manageStock: true,
                allowBackorder: false,
              })),
      }));
    } else {
      // Switch to variable
      setFormData((prev: any) => ({
        ...prev,
        productType: 'variable',
        // For variable, we typically manage stock at the variation level,
        // so let's clear out any simple product stock lines:
        stock: [],
      }));
    }
  };

  // =============== SUBMISSION ===============
  // 2 ways to submit:
  //  1) Save/Update as-is (could be draft, or whatever is in formData.status)
  //  2) Publish => forcibly sets status to "published"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSubmit(); // calls doSubmit with formData.status
  };

  const handlePublish = async () => {
    // forcibly set status = 'published'
    await doSubmit('published');
  };

  // The actual function that calls the API
  const doSubmit = async (forceStatus?: string) => {
    const method = productId ? 'PUT' : 'POST';
    const url = productId ? `/api/products/${productId}` : '/api/products';

    // Build the payload
    const statusToUse = forceStatus || formData.status;
    const payload: any = {
      name: formData.title,
      description: formData.description,
      type: formData.productType,
      status: statusToUse,
      categories: formData.categories,
      attributes: formData.attributes.map((attr: any) => ({
        attributeId: attr.attributeId,
        usedForVariation: attr.usedForVariation,
        terms: attr.usedForVariation ? [] : attr.terms,
      })),
      sku: formData.sku,
      imageURL: formData.imageURL || '', // parent image
    };

    if (formData.productType === 'simple') {
      payload.price = formData.price;
      payload.stock = formData.stock;
    } else {
      payload.variations = formData.variations.map((v: any) => ({
        sku: v.sku,
        price: v.price,
        terms: v.terms,
        stock: v.stock || [],
        imageURL: v.imageURL || '', // variant image
      }));
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (productId) {
          alert(
            statusToUse === 'published'
              ? 'Product updated & published!'
              : 'Product updated!'
          );
        } else {
          alert(
            statusToUse === 'published'
              ? 'Product created & published!'
              : 'Product created!'
          );
        }

        // If new product, reset form
        if (!productId) {
          setFormData({
            status: 'draft',
            title: '',
            description: '',
            categories: [],
            productType: 'simple',
            sku: '',
            price: 0,
            attributes: [],
            variations: [],
            stock: countriesData
              ? countriesData.map((c: any) => ({
                  countryCode: c.countryCode,
                  stockLevel: 0,
                  visibility: true,
                  manageStock: true,
                  allowBackorder: false,
                }))
              : [],
            imageURL: '',
          });
        }
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Something went wrong submitting the product.');
    }
  };

  // Should we show the "Variations" tab?
  const hasVariationAttribute = formData.attributes.some(
    (a: any) => a.usedForVariation
  );
  const showVariationsTab =
    formData.productType === 'variable' && hasVariationAttribute;

  // For rendering simple-product "Stock per Country"
  const renderSimpleStockLines = () => {
    return (
      <div className="space-y-4">
        {formData.stock.map((item: any, idx: number) => (
          <StockRow
            key={idx}
            stockItem={item}
            onChange={(updates) => {
              const copy = [...formData.stock];
              copy[idx] = { ...copy[idx], ...updates };
              setFormData((prev: any) => ({ ...prev, stock: copy }));
            }}
            onRemove={() => {
              const copy = [...formData.stock];
              copy.splice(idx, 1);
              setFormData((prev: any) => ({ ...prev, stock: copy }));
            }}
            countries={countriesData}
          />
        ))}

        <button
          type="button"
          onClick={() => {
            setFormData((prev: any) => ({
              ...prev,
              stock: [
                ...prev.stock,
                {
                  countryCode: '',
                  stockLevel: 0,
                  visibility: true,
                  manageStock: true,
                  allowBackorder: false,
                },
              ],
            }));
          }}
          className="mt-3 inline-block bg-gray-200 px-3 py-1 text-sm rounded hover:bg-gray-300"
        >
          + Add Stock Line
        </button>
      </div>
    );
  };

  // ====== RENDER ======
  if (!categories || !attributes || !countriesData || isCountriesLoading) {
    if (countriesError) {
      return <div>Error loading countries</div>;
    }
    return <div>Loading data...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
      {/* ---------------------------
          General Info
      ----------------------------*/}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="font-semibold text-tremor-content-strong">
            Product Details
          </h2>
          <p className="mt-1 text-tremor-default text-tremor-content">
            Enter basic information.
          </p>
        </div>
        <div className="md:col-span-2">
          {/* Status */}
          <div className='mb-3'>
            <label className="block font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev: any) => ({ ...prev, status: e.target.value }))
              }
              className="border rounded p-2 w-full"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Product Type */}
          <div className='mb-3'>
            <label className="block font-medium mb-1">Product Type</label>
            <select
              value={formData.productType}
              onChange={(e) => handleProductTypeChange(e.target.value)}
              className="border rounded p-2 w-full"
            >
              <option value="simple">Simple</option>
              <option value="variable">Variable</option>
            </select>
          </div>

          {/* Title */}
          <div className='mb-3'>
            <label className="block font-medium mb-1">Title</label>
            <TextInput
              value={formData.title}
              onChange={(e) =>
                setFormData((prev: any) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          {/* Description */}
          <div className='mb-3'> 
            <label className="block font-medium mb-1">Description</label>
            <QuillEditor
              value={formData.description}
              onChange={(content) =>
                setFormData((prev: any) => ({ ...prev, description: content }))
              }
            />
          </div>

          {/* Categories */}
          <div className="pr-10 mt-32 md:mt-21 pl-3">
            <label className="block font-medium mb-1">Categories</label>
            <div className="space-y-2">
              {(categories || []).map((cat: any) => (
                <div key={cat.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData((prev: any) => ({
                          ...prev,
                          categories: [...prev.categories, cat.id],
                        }));
                      } else {
                        setFormData((prev: any) => ({
                          ...prev,
                          categories: prev.categories.filter(
                            (c: any) => c !== cat.id
                          ),
                        }));
                      }
                    }}
                  />
                  <label className="ml-2">{cat.name}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Divider className="my-10" />

      {/* ---------------------------
          Inventory, Attributes, Variations
      ----------------------------*/}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="font-semibold text-tremor-content-strong">
            Inventory, Attributes, &amp; Variations
          </h2>
          <p className="mt-1 text-tremor-default text-tremor-content">
            Manage product details here.
          </p>
        </div>
        <div className="md:col-span-2">
          <TabGroup>
            <TabList>
              <Tab>Inventory</Tab>
              <Tab>Attributes</Tab>
              {showVariationsTab && <Tab>Variations</Tab>}
            </TabList>
            <TabPanels>
              {/* ========== INVENTORY Tab ========== */}
              <TabPanel>
                <div className="mt-4 space-y-4">
                  {/* SKU (always visible) */}
                  <div>
                    <label className="block font-medium mb-1">
                      Parent SKU
                    </label>
                    <TextInput
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      placeholder="ABC-123"
                    />
                  </div>

                  {/* Parent Image upload */}
                  <div>
                    <label className="block font-medium mb-1">Product Image</label>
                    {formData.imageURL && (
                      <img
                        src={formData.imageURL}
                        alt="Product"
                        className="w-32 h-32 object-cover mb-2 border border-gray-300"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleParentImageUpload}
                      className="block"
                    />
                  </div>

                  {/* If SIMPLE => show Price & stock lines */}
                  {formData.productType === 'simple' && (
                    <>
                      <div>
                        <label className="block font-medium mb-1">
                          Price
                        </label>
                        <NumberInput
                          value={formData.price}
                          onValueChange={(val) =>
                            setFormData({ ...formData, price: val })
                          }
                          step={0.01}
                        />
                      </div>

                      {/* Stock lines for simple product */}
                      <h3 className="font-medium">Stock per Country</h3>
                      {renderSimpleStockLines()}
                    </>
                  )}

                  {/* If VARIABLE => mention inventory is at variation level */}
                  {formData.productType === 'variable' && (
                    <p>For variable products, inventory is managed per variation.</p>
                  )}
                </div>
              </TabPanel>

              {/* ========== ATTRIBUTES Tab ========== */}
              <TabPanel>
                <div className="mt-4 space-y-4">
                  {/* Add an attribute */}
                  <div>
                    <label className="block font-medium mb-1">Add Attribute</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const attr = (attributes || []).find(
                          (a: any) => a.id === val
                        );
                        if (
                          attr &&
                          !formData.attributes.some(
                            (a: any) => a.attributeId === attr.id
                          )
                        ) {
                          setFormData((prev: any) => ({
                            ...prev,
                            attributes: [
                              ...prev.attributes,
                              {
                                attributeId: attr.id,
                                name: attr.name,
                                usedForVariation: false,
                                terms: [],
                              },
                            ],
                          }));
                        }
                      }}
                      className="border rounded p-2 w-full"
                      value=""
                    >
                      <option value="">Select an attribute...</option>
                      {(attributes || []).map((attr: any) => (
                        <option key={attr.id} value={attr.id}>
                          {attr.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Existing attributes */}
                  {formData.attributes.map((attr: any, idx: number) => (
                    <div
                      key={attr.attributeId}
                      className="border p-4 rounded space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <strong>{attr.name}</strong>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...formData.attributes];
                            copy.splice(idx, 1);
                            setFormData((prev: any) => ({
                              ...prev,
                              attributes: copy,
                            }));
                          }}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      {/* usedForVariation switch (only if variable) */}
                      {formData.productType === 'variable' && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={attr.usedForVariation}
                            onChange={(checked) => {
                              const copy = [...formData.attributes];
                              copy[idx].usedForVariation = checked;
                              // If unchecking it, remove any terms from variation usage
                              if (!checked) {
                                copy[idx].terms = [];
                              }
                              setFormData({ ...formData, attributes: copy });
                            }}
                          />
                          <label>Used for Variation</label>
                        </div>
                      )}

                      {/* Terms if not used for variation or product is simple */}
                      {(!attr.usedForVariation ||
                        formData.productType === 'simple') && (
                        <div>
                          <label className="block font-medium mb-1">
                            Terms for {attr.name}
                          </label>
                          <TermsSelector
                            attributeId={attr.attributeId}
                            selectedTerms={attr.terms}
                            onChange={(updatedTerms) => {
                              const copy = [...formData.attributes];
                              copy[idx].terms = updatedTerms;
                              setFormData({ ...formData, attributes: copy });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabPanel>

              {/* ========== VARIATIONS Tab (if showVariationsTab) ========== */}
              {showVariationsTab && (
                <TabPanel>
                  <div className="mt-4 space-y-4">
                    <h3 className="font-medium">Variations</h3>
                    {formData.variations.map((variant: any, i: number) => (
                      <div
                        key={i}
                        className="border p-4 rounded-md space-y-4"
                      >
                        <div className="flex justify-between items-center">
                          <h4>Variation {i + 1}</h4>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...formData.variations];
                              copy.splice(i, 1);
                              setFormData({ ...formData, variations: copy });
                            }}
                            className="text-red-500 hover:underline text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        {/* Variation Terms for each attribute with usedForVariation=true */}
                        {formData.attributes
                          .filter((a: any) => a.usedForVariation)
                          .map((attr: any) => {
                            const chosenTerm =
                              variant.terms.find(
                                (t: any) => t.attributeId === attr.attributeId
                              )?.termId || '';
                            return (
                              <div key={attr.attributeId}>
                                <label className="block font-medium mb-1">
                                  {attr.name}
                                </label>
                                <select
                                  className="border rounded p-2 w-full"
                                  value={chosenTerm}
                                  onChange={(e) => {
                                    const copy = [...formData.variations];
                                    const termIndex = copy[i].terms.findIndex(
                                      (t: any) =>
                                        t.attributeId === attr.attributeId
                                    );
                                    if (termIndex >= 0) {
                                      copy[i].terms[termIndex].termId =
                                        e.target.value;
                                    } else {
                                      copy[i].terms.push({
                                        attributeId: attr.attributeId,
                                        termId: e.target.value,
                                      });
                                    }
                                    setFormData({
                                      ...formData,
                                      variations: copy,
                                    });
                                  }}
                                >
                                  <option value="">Select term...</option>
                                  <TermsOptions
                                    attributeId={attr.attributeId}
                                  />
                                </select>
                              </div>
                            );
                          })}

                        {/* Variation SKU */}
                        <div>
                          <label className="block font-medium mb-1">
                            Variation SKU
                          </label>
                          <TextInput
                            value={variant.sku}
                            onChange={(e) => {
                              const copy = [...formData.variations];
                              copy[i].sku = e.target.value;
                              setFormData({ ...formData, variations: copy });
                            }}
                            placeholder="e.g. ABC-123-RED"
                          />
                        </div>

                        {/* Variation Image */}
                        <div>
                          <label className="block font-medium mb-1">
                            Variation Image
                          </label>
                          {variant.imageURL && (
                            <img
                              src={variant.imageURL}
                              alt="Variant"
                              className="w-32 h-32 object-cover mb-2 border border-gray-300"
                            />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleVariantImageUpload(e, i)}
                          />
                        </div>

                        {/* Variation Price */}
                        <div>
                          <label className="block font-medium mb-1">
                            Variation Price
                          </label>
                          <NumberInput
                            value={variant.price}
                            onValueChange={(val) => {
                              const copy = [...formData.variations];
                              copy[i].price = val;
                              setFormData({ ...formData, variations: copy });
                            }}
                            step={0.01}
                          />
                        </div>

                        {/* Variation Stock array */}
                        <div>
                          <label className="block font-medium mb-1">
                            Stock per Country (this variation)
                          </label>
                          <div className="space-y-4 mt-2">
                            {(variant.stock || []).map(
                              (st: any, sIndex: number) => (
                                <StockRow
                                  key={sIndex}
                                  stockItem={st}
                                  countries={countriesData}
                                  onChange={(updates) => {
                                    const copy = [...formData.variations];
                                    copy[i].stock[sIndex] = {
                                      ...copy[i].stock[sIndex],
                                      ...updates,
                                    };
                                    setFormData({
                                      ...formData,
                                      variations: copy,
                                    });
                                  }}
                                  onRemove={() => {
                                    const copy = [...formData.variations];
                                    copy[i].stock.splice(sIndex, 1);
                                    setFormData({
                                      ...formData,
                                      variations: copy,
                                    });
                                  }}
                                />
                              )
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...formData.variations];
                                copy[i].stock = copy[i].stock || [];
                                copy[i].stock.push({
                                  countryCode: '',
                                  stockLevel: 0,
                                  visibility: true,
                                  manageStock: true,
                                  allowBackorder: false,
                                });
                                setFormData({
                                  ...formData,
                                  variations: copy,
                                });
                              }}
                              className="mt-2 inline-block bg-gray-200 px-3 py-1 text-sm rounded hover:bg-gray-300"
                            >
                              + Add Stock Line
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Variation Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          variations: [
                            ...formData.variations,
                            {
                              sku: '',
                              price: 0,
                              terms: [],
                              stock: [],
                              imageURL: '',
                            },
                          ],
                        });
                      }}
                      className="bg-black text-white rounded-tremor-default px-4 py-2.5"
                    >
                      + Add Variation
                    </button>
                  </div>
                </TabPanel>
              )}
            </TabPanels>
          </TabGroup>
        </div>
      </div>

      {/* ---------------------------
          Form Actions
      ----------------------------*/}
      <div className="mt-10 flex gap-4 justify-end">
        {/* Publish button */}
        <button
          type="button"
          onClick={handlePublish}
          className="bg-green-600 text-white rounded-tremor-default px-4 py-2.5"
        >
          {productId ? 'Update & Publish' : 'Publish Product'}
        </button>

        {/* Normal Save/Update (Draft) */}
        <button
          type="submit"
          className="bg-tremor-brand text-white rounded-tremor-default px-4 py-2.5"
        >
          {productId ? 'Update Product' : 'Save Draft'}
        </button>
      </div>
    </form>
  );
}
