const { query } = require('../db');

/**
 * When stock goes from 0 to >0, return pending waitlist rows for notify UX.
 * Does not send SMS — caller builds WhatsApp links.
 */
async function onStockRestocked(productId, previousStock, nextStock) {
  const prev = Number(previousStock) || 0;
  const next = Number(nextStock) || 0;
  if (!(prev <= 0 && next > 0)) {
    return { notified: false, bookings: [] };
  }

  const r = await query(
    `SELECT pb.*, p.name AS product_name, p.slug
     FROM product_bookings pb
     JOIN products p ON p.id = pb.product_id
     WHERE pb.product_id = $1
       AND pb.status = 'pending'
     ORDER BY pb.created_at ASC`,
    [productId]
  );

  return {
    notified: false,
    restocked: true,
    bookings: r.rows,
    message:
      r.rowCount > 0
        ? `${r.rowCount} waitlist booking(s) ready to notify via WhatsApp`
        : 'Restocked — no pending waitlist',
  };
}

async function markBookingContacted(bookingId) {
  const r = await query(
    `UPDATE product_bookings
     SET status = 'contacted',
         notified_at = COALESCE(notified_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [bookingId]
  );
  return r.rows[0] || null;
}

module.exports = {
  onStockRestocked,
  markBookingContacted,
};
