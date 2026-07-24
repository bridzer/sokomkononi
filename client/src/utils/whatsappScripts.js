import { BUSINESS, formatKsh } from './format';
import { formatProductPrice } from './pricing';
import { deliveryLabel } from './delivery';

/**
 * WhatsApp sales scripts for Kalro Farm Kenya.
 * Use these as saved replies when a customer enquires.
 */

function greeting(customerName = '') {
  const name = customerName ? ` ${customerName}` : '';
  return `Hello${name}! Thank you for contacting ${BUSINESS.name}.`;
}

export function scriptProductEnquiry(product, { customerName } = {}) {
  const price = product ? formatProductPrice(product) : '';
  return `${greeting(customerName)}

Regarding *${product?.name || 'this product'}*:
• Price: ${price}
• Availability: ${product?.stock > 0 ? `In stock (${product.stock})` : 'Currently out of stock — we can book you'}
• Delivery: ${deliveryLabel()} countrywide

Would you like to:
1) Place an order now, or
2) Get a delivery quote for your county?

Reply with your preferred quantity and county.`;
}

export function scriptDairyGoats({ customerName, breed = 'Alpine / Toggenburg / Saanen' } = {}) {
  return `${greeting(customerName)}

Our dairy goats are:
✅ Fully vaccinated & disease-free
✅ Twin genetics for better productivity
✅ Mature does produce ~3–4 litres/day
✅ Guide book included for new farmers

Breed options: ${breed}
Delivery: ${deliveryLabel()} countrywide (free where applicable)

May I know:
1) How many goats do you need?
2) Which county should we deliver to?
3) Do you prefer does, bucks, or kids?`;
}

export function scriptBoerGoats({ customerName } = {}) {
  return `${greeting(customerName)}

Our Boer goats are selected for:
✅ Fast growth & good meat conformation
✅ Healthy, vaccinated stock
✅ Suitable for breeding or fattening

Delivery: ${deliveryLabel()} countrywide

Please share:
1) Number of animals needed
2) Your county / delivery location
3) Preferred age or weight range`;
}

export function scriptPoultry({ customerName, type = 'commercial layers / point-of-lay' } = {}) {
  return `${greeting(customerName)}

We supply ${type}:
✅ Healthy, vaccinated birds
✅ Ready for your farm or backyard
✅ Delivery: ${deliveryLabel()}

Please confirm:
1) Bird type (day-old / growers / point-of-lay / kanga)
2) Quantity
3) Delivery county`;
}

export function scriptEggs({ customerName, trays } = {}) {
  const qtyLine = trays ? `Quantity: ${trays} tray(s)` : 'Quantity: (please confirm trays needed)';
  return `${greeting(customerName)}

Fresh farm eggs from Naivasha:
✅ Farm-fresh trays
✅ Reliable weekly supply available
✅ Delivery: ${deliveryLabel()}

${qtyLine}

Share your estate / town and preferred delivery day — we can also set up a weekly subscription.`;
}

export function scriptOutOfStockBooking(product, { customerName } = {}) {
  return `${greeting(customerName)}

*${product?.name || 'This product'}* is currently out of stock.

We can *book* your request and notify you on WhatsApp as soon as it is available.

Please confirm:
1) Quantity you need
2) Your preferred county
3) Best WhatsApp number to reach you

Or book online at our product page — we will follow up promptly.`;
}

export function scriptOrderFollowUp(order, { customerName } = {}) {
  const total = order?.total_amount != null ? formatKsh(order.total_amount) : '';
  return `${greeting(customerName)}

We have received your order *${order?.order_number || ''}*.
Status: *${order?.status || 'pending'}*
Total: ${total}
Estimated delivery: ${order?.delivery_label || deliveryLabel()}

We will update you as your order moves to confirmed → processing → delivered.

Thank you for choosing ${BUSINESS.name}!`;
}

export function scriptCloseSale({ customerName, productName, total } = {}) {
  return `${greeting(customerName)}

To confirm your order for *${productName || 'your items'}*:
• Total: ${total || '(see quote)'}
• Delivery: ${deliveryLabel()}
• Payment: M-Pesa / pay on delivery (where available)

Please reply with:
1) Full name
2) Phone number
3) Delivery address + county

Once confirmed, we will schedule delivery. Asante! 🙏`;
}

/** Pick a script by product category slug / name keywords */
export function pickScriptForProduct(product, opts = {}) {
  const slug = (product?.category_slug || '').toLowerCase();
  const name = `${product?.category_name || ''} ${product?.name || ''}`.toLowerCase();

  if (Number(product?.stock) === 0) {
    return scriptOutOfStockBooking(product, opts);
  }
  if (slug.includes('egg') || name.includes('egg')) {
    return scriptEggs(opts);
  }
  if (slug.includes('boer') || name.includes('boer')) {
    return scriptBoerGoats(opts);
  }
  if (slug.includes('goat') || name.includes('goat') || slug.includes('dairy')) {
    return scriptDairyGoats(opts);
  }
  if (slug.includes('poultry') || name.includes('chick') || name.includes('layer') || name.includes('kanga')) {
    return scriptPoultry(opts);
  }
  return scriptProductEnquiry(product, opts);
}

export const WHATSAPP_SCRIPT_LIBRARY = [
  { id: 'enquiry', title: 'General product enquiry', build: scriptProductEnquiry },
  { id: 'dairy-goats', title: 'Dairy goats', build: () => scriptDairyGoats() },
  { id: 'boer-goats', title: 'Boer goats', build: () => scriptBoerGoats() },
  { id: 'poultry', title: 'Poultry', build: () => scriptPoultry() },
  { id: 'eggs', title: 'Eggs / trays', build: () => scriptEggs() },
  { id: 'out-of-stock', title: 'Out of stock booking', build: scriptOutOfStockBooking },
  { id: 'close-sale', title: 'Close the sale', build: () => scriptCloseSale() },
  { id: 'order-follow-up', title: 'Order follow-up', build: scriptOrderFollowUp },
];
