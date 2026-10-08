requireRole('employee');

let products = [];

async function loadProducts() {
  products = await api('/products');
  const container = document.getElementById('items-list');
  container.innerHTML = '';

  products.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'sale-item-row';
    row.innerHTML = `
      <span>${p.name} <span class="hint">(${p.quantity} in stock, KSh ${p.price} each)</span></span>
      <input type="number" min="0" value="0" id="qty-${p.id}" />
    `;
    container.appendChild(row);
  });
}

async function submitDailyRecord() {
  const notes = document.getElementById('notes').value.trim();
  const messageId = 'submit-message';

  const items = products
    .map((p) => ({
      product_id: p.id,
      quantity_sold: parseInt(document.getElementById(`qty-${p.id}`).value || '0', 10)
    }))
    .filter((item) => item.quantity_sold > 0);

  if (items.length === 0) {
    showMessage(messageId, 'Enter at least one item with a quantity greater than 0.');
    return;
  }
  if (items.some((item) => isNaN(item.quantity_sold) || item.quantity_sold < 0)) {
    showMessage(messageId, 'Quantities cannot be negative.');
    return;
  }

  try {
    const result = await api('/daily-records', {
      method: 'POST',
      body: JSON.stringify({ items, notes })
    });
    showMessage(
      messageId,
      `Saved. Expected revenue from today's sales: KSh ${result.total_expected_revenue}`,
      'success'
    );
    document.getElementById('notes').value = '';
    loadProducts(); // refresh stock numbers and reset quantities to 0
  } catch (err) {
    showMessage(messageId, err.message || 'Could not save today\'s sales. Please try again.');
  }
}

loadProducts();
