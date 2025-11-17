// api/klaviyo-subscribe.js

// ... (beginning of the file)

// Set CORS headers to allow requests ONLY from your Shopify domain
const allowedOrigins = [
  'https://speciment.myshopify.com', // <--- THIS MUST BE YOUR DOMAIN
  // Add any other domains if you have a custom domain pointing to Shopify
  // e.g., 'https://www.speciment.com' 
];

module.exports = async (req, res) => {
  // ... (retrieve secrets)

  // This block handles setting the header
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  // These headers are also essential for the preflight check:
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle CORS preflight request (the OPTIONS method request that failed)
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); 
  }

  // ... (rest of the API logic)
