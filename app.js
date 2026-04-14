const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Stripe with secret key from environment variables
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://mifoas.com',
    'https://www.mifoas.com',
    'http://localhost:3847',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));

/* ==========================================================================
   API Routes
   ========================================================================== */

// Create Ticket Checkout Session
app.post('/api/create-ticket-session', async (req, res) => {
  try {
    const { ticketType, quantity, email, name } = req.body;
    
    // Validate input
    if (!ticketType || !quantity || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const prices = {
      general: 15000, // USD 150.00 in cents
      vip: 35000      // USD 350.00 in cents
    };

    if (!prices[ticketType]) {
      return res.status(400).json({ error: 'Invalid ticket type' });
    }

    // Determine the host for success/cancel URLs
    const host = req.headers.origin || `http://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `MIFOAS Ticket - ${ticketType === 'vip' ? 'VIP' : 'General Admission'}`,
            description: 'Malmö International Festival of Oud and Arabic Song'
          },
          unit_amount: prices[ticketType]
        },
        quantity: parseInt(quantity)
      }],
      mode: 'payment',
      success_url: `${host}/pages/success.html?type=ticket`,
      cancel_url: `${host}/pages/tickets.html`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Create Artist Registration Checkout Session
app.post('/api/create-artist-session', async (req, res) => {
  try {
    const { email, name_en, name_ar, nationality, category, phone, media_link, bio } = req.body;

    // Validate input
    if (!email || !name_en || !name_ar) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine the host for success/cancel URLs
    const host = req.headers.origin || `http://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'MIFOAS Artist Registration Fee',
            description: `Malmö International Festival - Artist Participation (${category})`
          },
          unit_amount: 2500 // USD 25.00
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${host}/pages/success.html?type=artist`,
      cancel_url: `${host}/pages/artist-registration.html`,
      // Store artist data in metadata for later retrieval via webhooks if needed
      metadata: {
        name_en,
        name_ar,
        nationality,
        category,
        phone,
        media_link
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
