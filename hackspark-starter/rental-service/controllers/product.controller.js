class ProductController {
  constructor() {
    this.cachedCategories = null;
    this.categoriesCacheTime = 0;
    this.CACHE_TTL = 1000 * 60 * 60; // 1 hour cache
    
    // Bind methods to ensure `this` context is correct
    this.getCategories = this.getCategories.bind(this);
    this.getProducts = this.getProducts.bind(this);
    this.getProductById = this.getProductById.bind(this);
  }

  async getCategories() {
    if (this.cachedCategories && (Date.now() - this.categoriesCacheTime < this.CACHE_TTL)) {
      return this.cachedCategories;
    }
    
    const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
    const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;
    
    const response = await fetch(`${CENTRAL_API_URL}/api/data/categories`, {
      headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error('Failed to fetch categories');
      error.status = response.status;
      error.details = data;
      throw error;
    }
    
    this.cachedCategories = data.categories;
    this.categoriesCacheTime = Date.now();
    return this.cachedCategories;
  }

  async getProducts(req, res) {
    try {
      const category = req.query.category;
      
      // Step 1: Validate category if provided (P5)
      if (category) {
        try {
          const validCategories = await this.getCategories();
          if (!validCategories.includes(category)) {
            return res.status(400).json({
              error: `Invalid category '${category}'`,
              validOptions: validCategories
            });
          }
        } catch (err) {
          if (err.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded while verifying category. Please try again later.', details: err.details });
          }
          console.error('Error validating category:', err);
          return res.status(500).json({ error: 'Internal server error while validating category' });
        }
      }

      // Step 2: Fetch products (P3 logic extended for P5)
      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;
      
      const queryParams = new URLSearchParams(req.query).toString();
      const url = `${CENTRAL_API_URL}/api/data/products${queryParams ? '?' + queryParams : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${CENTRAL_API_TOKEN}`
        }
      });
      
      let data = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
          data = await response.json();
      } else {
          data = { message: await response.text() };
      }
      
      if (!response.ok) {
        let message = 'An error occurred while fetching products';
        if (response.status === 404) message = 'Products not found';
        if (response.status === 429) message = 'Rate limit exceeded. Please try again later.';
        
        return res.status(response.status).json({
          error: message,
          details: data
        });
      }
      
      // Return the full envelope exactly as received
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: 'Internal server error while communicating with Central API' });
    }
  }

  async getProductById(req, res) {
    try {
      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;
      
      const { id } = req.params;
      const url = `${CENTRAL_API_URL}/api/data/products/${id}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${CENTRAL_API_TOKEN}`
        }
      });
      
      let data = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
          data = await response.json();
      } else {
          data = { message: await response.text() };
      }
      
      if (!response.ok) {
        let message = 'An error occurred while fetching the product';
        if (response.status === 404) message = 'Product not found';
        if (response.status === 429) message = 'Rate limit exceeded. Please try again later.';
        
        return res.status(response.status).json({
          error: message,
          details: data
        });
      }
      
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      return res.status(500).json({ error: 'Internal server error while communicating with Central API' });
    }
  }
}

module.exports = new ProductController();
