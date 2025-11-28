"use client";

import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { addProduct, getAllProducts } from "@/actions/product/product";
import ProductForm from "@/domains/admin/components/product/productForm";
import ProductListItem from "@/domains/admin/components/product/productListItem";
import Button from "@/shared/components/UI/button";
import Popup from "@/shared/components/UI/popup";
import { TAddProductFormValues, TProductListItem } from "@/shared/types/product";

const initialForm: TAddProductFormValues = {
  name: "",
  brandID: "",
  specialFeatures: ["", "", ""],
  isAvailable: false,
  desc: "",
  price: "",
  salePrice: "",
  images: [],
  categoryID: "",
  specifications: [],
};

const AdminProducts = () => {
  const [showProductWindow, setShowProductWindow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState<string>("");
  const [formValues, setFormValues] = useState<TAddProductFormValues>(initialForm);
  const [productsList, setProductsList] = useState<TProductListItem[]>([]);

  useEffect(() => {
    // Fetch current user's tenantId from session
    const fetchTenantId = async () => {
      const session = await getSession();
      if (session?.user && typeof session.user === 'object' && 'tenantId' in session.user) {
        const tenantId = session.user.tenantId as string;
        setCurrentTenantId(tenantId);
        // Update the form values to include the current tenant
        setFormValues((prev) => ({ ...prev, tenantId }));
        // Now fetch products for this tenant
        const response = await getAllProducts(tenantId);
        if (response.res) setProductsList(response.res);
      }
    };

    fetchTenantId();
  }, []);

  const getProductsList = async () => {
    const response = await getAllProducts(currentTenantId);
    if (response.res) setProductsList(response.res);
  };

  const handleAddProduct = async () => {
    setIsLoading(true);
    const result = await addProduct(formValues);
    if (result.error) {
      setIsLoading(false);
      // surface server-side validation or other errors to the user
      try { alert(result.error); } catch {
        // fallback: noop
      }
      return;
    }
    if (result.res) {
      setIsLoading(false);
      setShowProductWindow(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'all' | 'categories' | 'topDeals' | 'outOfStock' | 'onSale'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = Array.from(new Set(productsList.map((p) => p.category.name)));

  const topDeals = productsList
    .filter((p) => p.salePrice != null)
    .map((p) => ({ ...p, discount: ((Number(p.price) - Number(p.salePrice)) / Number(p.price)) || 0 }))
    .sort((a, b) => (b.discount || 0) - (a.discount || 0));

  const filteredProducts = (() => {
    let filtered: TProductListItem[] = [];
    switch (activeTab) {
      case 'categories':
        filtered = !selectedCategory ? productsList : productsList.filter((p) => p.category.name === selectedCategory);
        break;
      case 'topDeals':
        filtered = topDeals;
        break;
      case 'outOfStock':
        filtered = productsList.filter((p) => p.stock == null || Number(p.stock) <= 0);
        break;
      case 'onSale':
        filtered = productsList.filter((p) => p.salePrice != null);
        break;
      default:
        filtered = productsList;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return filtered;
  })();

  const stats = {
    total: productsList.length,
    available: productsList.filter((p) => p.isAvailable).length,
    onSale: productsList.filter((p) => p.salePrice != null).length,
    outOfStock: productsList.filter((p) => p.stock == null || Number(p.stock) <= 0).length,
  };

  const tabs = [
    { id: 'all', label: 'All Products', icon: '📦', count: stats.total },
    { id: 'categories', label: 'By Category', icon: '🏷️', count: undefined },
    { id: 'topDeals', label: 'Top Deals', icon: '🔥', count: stats.onSale },
    { id: 'onSale', label: 'On Sale', icon: '🏷️', count: stats.onSale },
    { id: 'outOfStock', label: 'Out of Stock', icon: '❌', count: stats.outOfStock },
  ];

  return (
    <div className="flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen p-4 sm:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-600 mt-1">Manage and organize your product inventory</p>
          </div>
          <button
            onClick={() => setShowProductWindow(true)}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
          >
            ➕ Add Product
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 font-medium">Total</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 font-medium">Available</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.available}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 font-medium">On Sale</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">{stats.onSale}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 font-medium">Out of Stock</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{stats.outOfStock}</div>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id !== 'categories') setSelectedCategory('');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm flex items-center gap-2 ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && <span className="text-xs ml-1 opacity-75">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Category Selector */}
        {activeTab === 'categories' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div>
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredProducts.map((product) => (
              <ProductListItem key={product.id} data={product} requestReload={getProductsList} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="text-lg font-semibold text-gray-900">No Products Found</h3>
            <p className="text-gray-600 text-sm mt-1">Try adjusting your filters or add a new product</p>
          </div>
        )}
      </div>

      {showProductWindow && (
        <Popup
          content={<ProductForm formValues={formValues} onFormChange={setFormValues} tenantId={currentTenantId} />}
          isLoading={isLoading}
          onCancel={() => setShowProductWindow(false)}
          onClose={() => setShowProductWindow(false)}
          onSubmit={() => handleAddProduct()}
          confirmBtnText="Add Product"
          title="Add New Product"
        />
      )}
    </div>
  );
};

export default AdminProducts;
