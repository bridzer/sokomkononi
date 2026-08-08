const express = require('express');
const {
  createReserve,
  cancelReserve,
  getActiveReserve,
  expireStaleReserves,
} = require('../utils/reserves');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const {
      product_id: productId,
      customer_name: customerName,
      customer_phone: customerPhone,
      quantity,
      source,
    } = req.body || {};

    if (!productId || !customerName?.trim() || !customerPhone?.trim()) {
      return res.status(400).json({
        error: 'product_id, customer_name, and customer_phone are required',
      });
    }

    const result = await createReserve({
      productId: Number(productId),
      customerName,
      customerPhone,
      quantity,
      source: source || 'whatsapp_hold',
    });

    res.status(result.alreadyHeld ? 200 : 201).json({
      reserve: result.reserve,
      already_held: result.alreadyHeld,
      message: result.alreadyHeld
        ? 'You already have an active hold on this lot'
        : 'Lot held successfully',
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

router.get('/product/:productId', async (req, res, next) => {
  try {
    await expireStaleReserves();
    const reserve = await getActiveReserve(Number(req.params.productId));
    res.json({ reserve });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', requireAdmin, async (req, res, next) => {
  try {
    const reserve = await cancelReserve(Number(req.params.id));
    if (!reserve) {
      return res.status(404).json({ error: 'Active reserve not found' });
    }
    res.json({ reserve });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
