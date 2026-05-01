import React from 'react';
import { Modal } from '../common/Modal.jsx';
import { Badge } from '../common/Badge.jsx';
import { formatCurrency } from '../../utils/formatters.js';

export const ProductModal = ({ product, onClose }) => {
  if (!product) return null;

  return (
    <Modal isOpen={!!product} onClose={onClose} className="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="primary">{product.category}</Badge>
            <h2 className="mt-3 text-lg font-semibold text-rent-950">
              {product.name}
            </h2>
          </div>
        </div>

        <dl className="space-y-3">
          <DetailItem label="Product ID" value={product.id} />
          <DetailItem label="Owner ID" value={product.ownerId} />
          <DetailItem 
            label="Daily Price" 
            value={formatCurrency(product.pricePerDay)} 
          />
        </dl>
      </div>
    </Modal>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-rent-100 last:border-0">
    <dt className="text-sm text-rent-700">{label}</dt>
    <dd className="font-semibold text-rent-950">{value}</dd>
  </div>
);

export default ProductModal;
