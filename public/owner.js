requireRole('owner');

// ---------- Daily reconciliation ----------
async function loadDailyRecords() {
  const records = await api('/daily-records');
  const container = document.getElementById('daily-records-list');

  if (records.length === 0) {
    container.innerHTML = '<p class="hint">No daily sales have been recorded yet.</p>';
    return;
  }

  container.innerHTML = records
    .map((r) => {
      const itemsList = r.items
        .map((i) => `${i.product_name} x ${i.quantity_sold}`)
        .join(', ');

      let badge;
      let cashSection;
      if (r.actual_cash_received == null) {
        badge = '<span class="badge badge-pending">Awaiting cash count</span>';
        cashSection = `
          <input type="number" placeholder="Cash actually received" id="cash-${r.id}" />
          <button onclick="submitCash(${r.id})">Save Cash Received</button>
        `;
      } else if (r.difference === 0) {
        badge = '<span class="badge badge-match">Matches</span>';
        cashSection = `<p>Cash received: KSh ${r.actual_cash_received} — matches expected revenue.</p>`;
      } else {
        const direction = r.difference > 0 ? 'more' : 'less';
        badge = '<span class="badge badge-mismatch">Mismatch</span>';
        cashSection = `<p class="error">Cash received: KSh ${r.actual_cash_received} — KSh ${Math.abs(r.difference)} ${direction} than expected.</p>`;
      }

      return `
        <div class="record-card">
          <div class="record-header">
            <strong>${r.record_date}</strong> — recorded by ${r.employee_name}
            ${badge}
          </div>
          <p class="hint">Items sold: ${itemsList}</p>
          <p>Expected revenue: <strong>KSh ${r.total_expected_revenue}</strong></p>
          ${r.notes ? `<p class="hint">Notes: ${r.notes}</p>` : ''}
          <div id="cash-message-${r.id}"></div>
          ${cashSection}
        </div>
      `;
    })
    .join('');
}

async function submitCash(recordId) {
  const raw = document.getElementById(`cash-${recordId}`).value;
  const actual_cash_received = parseFloat(raw);
  const messageId = `cash-message-${recordId}`;

  if (raw === '' || isNaN(actual_cash_received) || actual_cash_received < 0) {
    showMessage(messageId, 'Enter a valid cash amount (0 or more).');
    return;
  }

  try {
    await api(`/daily-records/${recordId}/cash`, {
      method: 'PUT',
      body: JSON.stringify({ actual_cash_received })
    });
    loadDailyRecords();
  } catch (err) {
    showMessage(messageId, err.message || 'Could not save the cash amount.');
  }
}

// ---------- Stock + restock ----------
async function loadStock() {
  const products = await api('/products');
  const tbody = document.querySelector('#stock-table tbody');
  tbody.innerHTML = products
    .map(
      (p) => `
      <tr>
        <td>${p.name}</td>
        <td>KSh ${p.price}</td>
        <td>${p.quantity}</td>
        <td>
          <input type="number" min="1" placeholder="Amount" id="restock-${p.id}" style="width:90px;display:inline-block;margin:0" />
          <button onclick="restock(${p.id})" style="padding:6px 10px;font-size:13px">Add</button>
        </td>
      </tr>
    `
    )
    .join('');
}

async function restock(productId) {
  const raw = document.getElementById(`restock-${productId}`).value;
  const amount = parseInt(raw, 10);

  if (raw === '' || isNaN(amount) || amount <= 0) {
    alert('Enter a restock amount greater than 0.');
    return;
  }

  try {
    await api(`/products/${productId}/restock`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
    loadStock();
  } catch (err) {
    alert(err.message || 'Could not restock this item.');
  }
}

// ---------- Add product ----------
async function addProduct() {
  const name = document.getElementById('new-product-name').value.trim();
  const priceRaw = document.getElementById('new-product-price').value;
  const qtyRaw = document.getElementById('new-product-qty').value;
  const price = parseFloat(priceRaw);
  const quantity = qtyRaw === '' ? 0 : parseInt(qtyRaw, 10);
  const messageId = 'add-product-message';

  if (!name) {
    showMessage(messageId, 'Please enter a product name.');
    return;
  }
  if (priceRaw === '' || isNaN(price) || price <= 0) {
    showMessage(messageId, 'Please enter a valid price greater than 0.');
    return;
  }
  if (isNaN(quantity) || quantity < 0) {
    showMessage(messageId, 'Starting quantity cannot be negative.');
    return;
  }

  try {
    await api('/products', { method: 'POST', body: JSON.stringify({ name, price, quantity }) });
    showMessage(messageId, `"${name}" added successfully.`, 'success');
    document.getElementById('new-product-name').value = '';
    document.getElementById('new-product-price').value = '';
    document.getElementById('new-product-qty').value = '';
    loadStock();
  } catch (err) {
    showMessage(messageId, err.message || 'Could not add product. Please try again.');
  }
}

// ---------- Add employee ----------
async function addEmployee() {
  const name = document.getElementById('new-employee-name').value.trim();
  const username = document.getElementById('new-employee-username').value.trim();
  const password = document.getElementById('new-employee-password').value;
  const messageId = 'add-employee-message';

  if (!name || !username || !password) {
    showMessage(messageId, 'Please fill in name, username, and password.');
    return;
  }
  if (username.includes(' ')) {
    showMessage(messageId, 'Username cannot contain spaces.');
    return;
  }
  if (password.length < 6) {
    showMessage(messageId, 'Password must be at least 6 characters.');
    return;
  }

  try {
    await api('/auth/employees', { method: 'POST', body: JSON.stringify({ name, username, password }) });
    showMessage(messageId, `Employee "${name}" added successfully.`, 'success');
    document.getElementById('new-employee-name').value = '';
    document.getElementById('new-employee-username').value = '';
    document.getElementById('new-employee-password').value = '';
  } catch (err) {
    showMessage(messageId, err.message || 'Could not add employee. Please try again.');
  }
}

loadDailyRecords();
loadStock();
