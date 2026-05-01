class ProductController {
  async getProducts(req, res) {
    try {
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
