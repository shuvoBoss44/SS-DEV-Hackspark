import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Panel } from '../components/common/Panel.jsx';
import { Button } from '../components/common/Button.jsx';
import { Notice } from '../components/common/Notice.jsx';
import { SkeletonGrid } from '../components/common/Skeleton.jsx';
import { ProductCard } from '../components/products/ProductCard.jsx';
import { getToday } from '../utils/formatters.js';
import { RefreshCw } from 'lucide-react';

export const Trending = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/analytics/recommendations', {
        date: getToday(),
        limit: 6
      });
      setItems(data.recommendations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Panel 
      title="Trending today" 
      subtitle="Seasonal recommendations based on historical demand around today's date."
      action={
        <Button 
          variant="secondary" 
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {loading && <SkeletonGrid count={6} />}
      
      {error && <Notice kind="error">{error}</Notice>}
      
      {!loading && !error && items.length === 0 && (
        <Notice>No recommendations are available yet.</Notice>
      )}
      
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ProductCard 
              key={item.productId} 
              product={item} 
              score={item.score} 
            />
          ))}
        </div>
      )}
    </Panel>
  );
};

export default Trending;
