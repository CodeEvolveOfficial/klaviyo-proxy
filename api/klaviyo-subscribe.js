// api/klaviyo-subscribe.js

const fetch = require('node-fetch');

// Vercel Serverless Function entry point
module.exports = async (req, res) => {
  // 1. SECURITY & CONFIGURATION
  const KLAVIYO_PRIVATE_KEY = process.env.KLAVIYO_PRIVATE_KEY;
  const KLAVIYO_LIST_ID = process.env.KLAVIYO_LIST_ID;
  const ALLOWED_ORIGIN = 'https://speciment.myshopify.com'; // Your specific Shopify store domain

  // --- 2. CRITICAL CORS FIX (Must execute first) ---

  // A. Set the Access-Control-Allow-Origin header (allows Shopify to talk to Vercel)
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN); 
  
  // B. Set headers required for all preflight and actual requests
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // C. Handle the preflight OPTIONS request and immediately exit the function
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); 
  }

  // --- 3. INPUT VALIDATION & METHOD CHECK ---
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, first_name } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  // 4. Build the V3 API payload
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

  // 5. Make the secure POST request to Klaviyo
  try {
    const klaviyoResponse = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_KEY}`, 
        'Content-Type': 'application/json',
        'revision': '2024-07-15' 
      },
      body: JSON.stringify(apiRequestBody)
    });

    // 6. Handle Klaviyo's response (202 = Accepted)
    if (klaviyoResponse.status === 202) {
      res.status(202).json({ message: "Subscription successful." });
    } else {
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
