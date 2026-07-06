export const BUSINESS = {
  name: 'Kalro Farm Kenya',
  location: 'Naivasha, Kenya',
  phone: '0756908482',
  phoneIntl: '+254756908482',
  whatsapp: '254756908482',
  email: 'info@kalrofarm.co.ke',
};

export function formatKsh(amount) {
  const n = Number(amount) || 0;
  return `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

export function whatsappUrl(text) {
  const encoded = encodeURIComponent(text || '');
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encoded}`;
}

export function orderWhatsAppMessage(product) {
  return (
    `Hello ${BUSINESS.name}, I'm interested in *${product.name}*` +
    (product.age_stage ? ` (${product.age_stage})` : '') +
    ` priced at KSh ${Number(product.price).toLocaleString()}. Please share more details.`
  );
}

export function cartWhatsAppMessage(items, total, customer) {
  const lines = [
    `Hello ${BUSINESS.name}, I'd like to place an order:`,
    '',
    ...items.map(
      (i) =>
        `- ${i.name} x${i.quantity} @ KSh ${Number(i.price).toLocaleString()} = KSh ${(
          i.price * i.quantity
        ).toLocaleString()}`
    ),
    '',
    `Total: KSh ${Number(total).toLocaleString()}`,
  ];
  if (customer) {
    lines.push('');
    if (customer.name) lines.push(`Name: ${customer.name}`);
    if (customer.phone) lines.push(`Phone: ${customer.phone}`);
    if (customer.delivery_address) lines.push(`Address: ${customer.delivery_address}`);
    if (customer.county) lines.push(`County: ${customer.county}`);
    if (customer.order_number) lines.push(`Order Number: ${customer.order_number}`);
  }
  return lines.join('\n');
}
