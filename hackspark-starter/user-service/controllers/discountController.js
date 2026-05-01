const axios = require('axios');

// GET /users/:id/discount
exports.getDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    // Call Central API (Requires CENTRAL_API_TOKEN in env)
    const centralApiUrl = `${process.env.CENTRAL_API_URL}/api/data/users/${id}`;
    
    let centralUser;
    try {
      const response = await axios.get(centralApiUrl, {
        headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` }
      });
      centralUser = response.data;
    } catch (apiError) {
      if (apiError.response && apiError.response.status === 404) {
        return res.status(404).json({ error: 'User not found in Central API' });
      }
      throw apiError; // Pass to main catch block
    }

    const score = centralUser.securityScore;
    let discountPercent = 0;

    // Discount Tier Logic
    if (score >= 80) discountPercent = 20;
    else if (score >= 60) discountPercent = 15;
    else if (score >= 40) discountPercent = 10;
    else if (score >= 20) discountPercent = 5;

    res.json({
      userId: centralUser.id,
      securityScore: score,
      discountPercent: discountPercent
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discount information' });
  }
};