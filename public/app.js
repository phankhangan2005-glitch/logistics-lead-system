const leadTableBody = document.getElementById('leadTableBody');
const totalLeadsEl = document.getElementById('totalLeads');
const typeOneCountEl = document.getElementById('typeOneCount');
const quotedCountEl = document.getElementById('quotedCount');
const crmReadyCountEl = document.getElementById('crmReadyCount');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const leadForm = document.getElementById('leadForm');
const csvFileInput = document.getElementById('csvFileInput');

let leads = [];

function badgeClass(rating) {
  if (rating === 'Loại 1: Tiềm năng cao') return 'badge-type-1';
  if (rating === 'Loại 2: Trung bình') return 'badge-type-2';
  return 'badge-type-3';
}

async function fetchLeads() {
  const res = await fetch('/api/leads');
  leads = await res.json();
  renderTable();
  await fetchStats();
}

async function fetchStats() {
  const res = await fetch('/api/stats');
  const stats = await res.json();

  totalLeadsEl.textContent = `${stats.total} / ${stats.max}`;
  typeOneCountEl.textContent = stats.type1;
  quotedCountEl.textContent = stats.quoted;
  crmReadyCountEl.textContent = stats.crmReady;
}

function getFilteredLeads() {
  const keyword = searchInput.value.trim().toLowerCase();
  const selected = statusFilter.value;

  return leads.filter((lead) => {
    const matchesKeyword = !keyword || lead.companyName.toLowerCase().includes(keyword);
    const matchesStatus = selected === 'all' || lead.rating === selected;
    return matchesKeyword && matchesStatus;
  });
}

function renderTable() {
  const filtered = getFilteredLeads();

  if (!filtered.length) {
    leadTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">Không có dữ liệu phù hợp.</td>
      </tr>
    `;
    return;
  }

  leadTableBody.innerHTML = filtered.map((lead) => `
    <tr>
      <td><strong>${lead.companyName}</strong></td>
      <td>${lead.serviceNeed}</td>
      <td>${lead.scale}</td>
      <td>${lead.payment}</td>
      <td><span class="badge ${badgeClass(lead.rating)}">${lead.rating}</span></td>
      <td><span class="status-badge bg-success text-white">${lead.quoteStatus}</span></td>
      <td><span class="status-badge bg-primary text-white">${lead.customerFeedback}</span></td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary btn-action" data-action="edit" data-id="${lead.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-action" data-action="delete" data-id="${lead.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

leadTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'delete') {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;

    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    await fetchLeads();
  }

  if (action === 'edit') {
    const lead = leads.find(item => item.id === id);
    if (!lead) return;

    document.getElementById('leadId').value = lead.id;
    document.getElementById('companyName').value = lead.companyName;
    document.getElementById('serviceNeed').value = lead.serviceNeed;
    document.getElementById('scale').value = lead.scale;
    document.getElementById('payment').value = lead.payment;
    document.getElementById('rating').value = lead.rating;
    document.getElementById('quoteStatus').value = lead.quoteStatus;
    document.getElementById('customerFeedback').value = lead.customerFeedback;
    document.getElementById('crmAction').value = lead.crmAction;

    const modal = new bootstrap.Modal(document.getElementById('leadModal'));
    modal.show();
  }
});

leadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    companyName: document.getElementById('companyName').value,
    serviceNeed: document.getElementById('serviceNeed').value,
    scale: document.getElementById('scale').value,
    payment: document.getElementById('payment').value,
    rating: document.getElementById('rating').value,
    quoteStatus: document.getElementById('quoteStatus').value,
    customerFeedback: document.getElementById('customerFeedback').value,
    crmAction: document.getElementById('crmAction').value,
    source: 'Manual'
  };

  const id = document.getElementById('leadId').value;

  if (id) {
    await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  leadForm.reset();
  document.getElementById('leadId').value = '';
  bootstrap.Modal.getInstance(document.getElementById('leadModal')).hide();
  await fetchLeads();
});

searchInput.addEventListener('input', renderTable);
statusFilter.addEventListener('change', renderTable);

function parseCSV(text) {
  const rows = text.split(/\r?\n/).filter(Boolean);
  const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = rows.slice(1).map((row) => {
    const cells = row.split(',').map(c => c.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = cells[index] || '';
    });
    return obj;
  });

  return data.filter(item => item.companyName || item['Tên doanh nghiệp'] || item['Tên Doanh Nghiệp']);
}

csvFileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  const rows = parseCSV(text);

  const mappedRows = rows.map(item => ({
    companyName: item.companyName || item['Tên doanh nghiệp'] || item['Tên Doanh Nghiệp'],
    serviceNeed: item.serviceNeed || item['Nhu cầu dịch vụ'] || 'N/A',
    scale: item.scale || item['Quy mô'] || 'N/A',
    payment: item.payment || item['Thanh toán'] || 'N/A',
    rating: item.rating || item['Đánh giá'] || 'Loại 3: Tiềm năng thấp',
    quoteStatus: item.quoteStatus || item['Trạng thái Báo giá'] || 'Chưa gửi',
    customerFeedback: item.customerFeedback || item['Phản hồi KH'] || 'Chưa phản hồi',
    crmAction: item.crmAction || item['Thao tác CRM'] || 'Bỏ qua'
  }));

  await fetch('/api/leads/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mappedRows)
  });

  csvFileInput.value = '';
  await fetchLeads();
});

fetchLeads();
