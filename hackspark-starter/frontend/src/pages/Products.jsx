import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Panel } from '../components/common/Panel.jsx';
import { ProductGrid } from '../components/products/ProductGrid.jsx';
import { ProductFilters } from '../components/products/ProductFilters.jsx';
import { ProductModal } from '../components/products/ProductModal.jsx';
import { Pagination } from '../components/products/Pagination.jsx';

export const Products = () => {
  const [query, setQuery] = useState({ page: 1, limit: 12, category: '' });
  const [state, setState] = useState({ 
    loading: true, 
    error: '', 
    data: [], 
    totalPages: 1, 
    total: 0 
  });
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const params = { page: query.page, limit: query.limit };
      if (query.category) params.category = query.category;
      
      const data = await api.get('/rentals/products', params);
      setState({ 
        loading: false, 
        error: '', 
        data: data.data || [], 
        totalPages: data.totalPages || 1, 
        total: data.total || 0 
      });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  };

  useEffect(() => {
    load();
  }, [query.page, query.limit, query.category]);

  return (
    <Panel 
      title="Products" 
      subtitle="Browse RentPi inventory with pagination and category filtering."
    >
      <ProductFilters
        category={query.category}
        onCategoryChange={(category) => setQuery({ ...query, category, page: 1 })}
        limit={query.limit}
        onLimitChange={(limit) => setQuery({ ...query, limit, page: 1 })}
        total={state.total}
      />

      <ProductGrid
        products={state.data}
        loading={state.loading}
        error={state.error}
        onProductClick={setSelected}
      />

      <Pagination
        page={query.page}
        totalPages={state.totalPages}
        onPageChange={(page) => setQuery({ ...query, page })}
      />

      <ProductModal 
        product={selected} 
        onClose={() => setSelected(null)} 
      />
    </Panel>
  );
};

export default Products;
