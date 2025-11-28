"use client";
import { getSession } from "next-auth/react";
import { useState } from "react";

import { deleteProduct, updateProduct } from "@/actions/product/product";
import ProductForm from "@/domains/admin/components/product/productForm";
import Button from "@/shared/components/UI/button";
import Popup from "@/shared/components/UI/popup";
import { TProductListItem } from "@/shared/types/product";

type TProps = {
  data: TProductListItem;
  requestReload: () => void;
};

const ProductListItem = ({ data, requestReload }: TProps) => {
  const [showDelete, setShowDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editForm, setEditForm] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    const response = await deleteProduct(data.id, tenantId ?? undefined);
    if (response.error) {
      setIsLoading(false);
    }
    if (response.res) {
      setIsLoading(false);
      requestReload();
    }
  };

  const openEdit = async () => {
    // get tenant id from session
    const session = await getSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tId = session?.user && typeof session.user === 'object' && 'tenantId' in session.user ? (session.user as any).tenantId : null;
    setTenantId(tId ?? null);
    // map list item to form values
    setEditForm({
      name: data.name,
      tenantId: tId ?? undefined,
      isAvailable: data.isAvailable,
      specialFeatures: [],
      brandID: data.brandID ?? "",
      desc: data.description ?? "",
      shortDescription: data.shortDescription ?? "",
      price: String(data.price ?? 0),
      salePrice: data.salePrice != null ? String(data.salePrice) : "",
      images: data.images ?? [],
      categoryID: data.category.id,
      specifications: [],
      stock: data.stock != null ? String(data.stock) : "",
    });
    setShowEdit(true);
  };

  const handleEditSubmit = async () => {
    if (!editForm) return;
    setEditLoading(true);
    const res = await updateProduct(data.id, editForm);
    if (res.error) {
      setEditLoading(false);
      try { alert(res.error); } catch {
        // fallback
      }
      return;
    }
    setEditLoading(false);
    setShowEdit(false);
    requestReload();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* Product Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{data.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{data.category.name}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${data.isAvailable
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {data.isAvailable ? (
                <>
                  <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Available</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Out of stock</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Product Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-600 font-medium">Price</div>
            <div className="text-lg font-bold text-gray-900 mt-1">€{data.price}</div>
          </div>
          {data.salePrice && (
            <div>
              <div className="text-xs text-gray-600 font-medium">Sale Price</div>
              <div className="text-lg font-bold text-orange-600 mt-1">€{data.salePrice}</div>
              <div className="text-xs text-green-600 mt-1">
                -{Math.round(((Number(data.price) - Number(data.salePrice)) / Number(data.price)) * 100)}%
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-600 font-medium">Stock</div>
            <div className={`text-lg font-bold mt-1 ${data.stock == null || Number(data.stock) <= 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
              {data.stock ?? 'N/A'}
            </div>
          </div>
          {data.shortDescription && (
            <div className="col-span-2 sm:col-span-1">
              <div className="text-xs text-gray-600 font-medium">Description</div>
              <p className="text-sm text-gray-700 mt-1 line-clamp-2">{data.shortDescription}</p>
            </div>
          )}
        </div>

        {/* Images */}
        {data.images.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-600 font-medium mb-2">Images</div>
            <div className="flex gap-2">
              {data.images.slice(0, 4).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`product-${idx}`}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:border-blue-500 transition"
                />
              ))}
              {data.images.length > 4 && (
                <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">+{data.images.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => openEdit()}
            className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h6M14 2l7 7-9 9-7-7 9-9z" />
            </svg>
            <span>Edit</span>
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-7 4h10" />
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>
      {showEdit && editForm && (
        <Popup
          content={<div className="p-2"><h3 className="mb-2 font-semibold">Edit Product</h3><ProductForm formValues={editForm} onFormChange={setEditForm} tenantId={tenantId ?? undefined} /></div>}
          isLoading={editLoading}
          onCancel={() => setShowEdit(false)}
          onClose={() => setShowEdit(false)}
          onSubmit={() => handleEditSubmit()}
          confirmBtnText="Save"
          title="Edit Product"
        />
      )}
      {showDelete && (
        <Popup
          content={<span className="block text-center p-6 pb-10">Are You Sure?</span>}
          width="300px"
          isLoading={isLoading}
          onCancel={() => setShowDelete(false)}
          onClose={() => setShowDelete(false)}
          onSubmit={() => handleDelete()}
          cancelBtnText="NO"
          confirmBtnText="YES"
        />
      )}
    </div>
  );
};

export default ProductListItem;
