// api/klaviyo-subscribe.js

// You will use node-fetch to make the API call to Klaviyo
const fetch = require('node-fetch');

// --- CORS Configuration ---
// Add your Shopify domain here. Vercel must approve this origin.
const allowedOrigins = [
  'https://speciment.myshopify.com', 
  // Add your custom domain (e.g., 'https://www.speciment.com') if you have one
];

// Vercel Serverless Function entry point
module.exports = async (req, res) => {
  // 1. **SECURITY:** Retrieve secrets from environment variables
  // These are set in the Vercel dashboard and are NOT exposed to the client.
  const KLAVIYO_PRIVATE_KEY = process.env.KLAVIYO_PRIVATE_KEY;
  const KLAVIYO_LIST_ID = process.env.KLAVIYO_LIST_ID;
  
  // --- CORS HEADER HANDLING (Fixes 'Failed to fetch') ---
  const origin = req.headers.origin;
  
  // Set the Access-Control-Allow-Origin header only if the origin is in the allowed list
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Optional: Log if an unauthorized domain tries to access the endpoint
    console.warn('Unauthorized CORS attempt from:', origin);
  }
  
  // These headers are essential for the browser's preflight check (OPTIONS request)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // -----------------------------------------------------

  // Ensure method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Ensure we have an email
  const { email, first_name } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  // 2. Build the V3 API payload
  const apiRequestBody = {
    "data": {
      "type": "profile-subscription-bulk-create-job",
      "attributes": {
        "custom_source": "Shopify Vercel Proxy (Speciment)",
        "profiles": {
          "data": [
            {
              "type": "profile",
              "attributes": {
                "email": email,
                "properties": {
                  "first_name": first_name || undefined
                }
              }
            }
          ]
        }
      },
      "relationships": {
        "list": {
          "data": {
            "type": "list",
            "id": KLAVIYO_LIST_ID 
          }
        }
      }
    }
  };

  // 3. Make the secure POST request to Klaviyo
  try {
    const klaviyoResponse = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_KEY}`, 
        'Content-Type': 'application/json',
        'revision': '2024-07-15' // Use a recent stable API revision
      },
      body: JSON.stringify(apiRequestBody)
    });

    // 4. Handle Klaviyo's response
    if (klaviyoResponse.status === 202) {
      // 202 is success (job accepted)
      res.status(202).json({ message: "Subscription successful." });
    } else {
      // Forward Klaviyo's error response
      const errorData = await klaviyoResponse.json();
      res.status(klaviyoResponse.status).json({ 
        message: "Klaviyo API Error", 
        details: errorData 
      });
    }
  } catch (error) {
    console.error("Vercel Proxy Internal Error:", error);
    res.status(500).json({ message: "Internal server error connecting to Klaviyo." });
  }
};
