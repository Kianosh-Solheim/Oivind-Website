import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import cors from "cors";

// Initialize Express app
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API route to create a Stripe checkout session
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { bookId, bookTitle, price, successUrl, cancelUrl } = req.body;
    
    // Check for Stripe key
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: "Stripe er ikkje konfigurert (mangler STRIPE_SECRET_KEY)." });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16", // or whatever the latest is, using standard default
    });

    // We assume price is in NOK, provided as normal number (e.g., 299). Stripe expects smallest unit (øre), so multiply by 100
    const unitAmount = Math.round((price || 299) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "nok",
            product_data: {
              name: bookTitle,
              description: "Kjøp av bok på nett",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl,
      metadata: {
        bookId,
        bookTitle,
      },
      shipping_address_collection: {
        allowed_countries: ["NO", "SE", "DK"],
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Feil ved opprettelse av checkout-session:", error);
    res.status(500).json({ error: error.message });
  }
});

// API route to verify checkout session
app.get("/api/verify-checkout-session", async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id || typeof session_id !== "string") {
      return res.status(400).json({ error: "Mangler session_id" });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: "Stripe er ikkje konfigurert" });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    res.json({
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      customer_name: session.customer_details?.name,
      amount_total: session.amount_total,
      metadata: session.metadata,
      shipping: session.shipping_details
    });
  } catch (error: any) {
    console.error("Feil ved verifisering av session:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
