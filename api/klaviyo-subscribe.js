// api/klaviyo-subscribe.js

// You will use node-fetch to make the API call to Klaviyo
const fetch = require('node-fetch');

// Vercel Serverless Function entry point
module.exports = async (req, res) => {
  // 1. **SECURITY:** Retrieve secrets from environment variables
  // Vercel handles the secure storage of these keys in its dashboard settings.
  const KLAVIYO_PRIVATE_KEY = process.env.KLAVIYO_PRIVATE_KEY;
  const KLAVIYO_LIST_ID = process.env.KLAVIYO_LIST_ID;
  
  // Set CORS headers to allow your Shopify domain to access this function
  // CHANGE THIS TO YOUR ACTUAL SHOPIFY DOMAIN!
  res.setHeader('Access-Control-Allow-Origin', 'https://YOUR-SHOPIFY-DOMAIN.myshopify.com'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
        "custom_source": "Shopify Vercel Proxy",
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
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_KEY}`, // Uses the secret key
        'Content-Type': 'application/json',
        'revision': '2024-07-15' 
      },
      body: JSON.stringify(apiRequestBody)
    });

    // 4. Handle Klaviyo's response
    if (klaviyoResponse.status === 202) {
      // 202 is success (job accepted)
      res.status(202).json({ message: "Subscription successful." });
    } else {
      const errorData = await klaviyoResponse.json();
      res.status(klaviyoResponse.status).json({ 
        message: "Klaviyo API Error", 
        details: errorData 
      });
    }
  } catch (error) {
    console.error("Vercel Proxy Error:", error);
    res.status(500).json({ message: "Internal server error connecting to Klaviyo." });
  }
};
