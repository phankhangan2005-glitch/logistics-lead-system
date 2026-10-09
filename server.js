const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || '';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const inMemoryLeads = [
  {
    id: 'lead-1',
    companyName: 'Công ty TNHH Vận tải A',
    serviceNeed: 'Kho vận & Hải quan',
    scale: 'Lớn (Thường xuyên)',
    payment: 'Tốt',
    rating: 'Loại 1: Tiềm năng cao',
    quoteStatus: 'Đã gửi mẫu A',
    customerFeedback: 'Đồng ý hợp tác',
    crmAction: 'Đẩy qua CRM',
    source: 'Manual',
    createdAt: new Date().toISOString()
  },
  {
    id: 'lead-2',
    companyName: 'Tập đoàn Xuất Nhập Khẩu B',
    serviceNeed: 'Vận tải Quốc tế',
    scale: 'Trung bình',
    payment: 'Cần xem xét',
    rating: 'Loại 2: Trung bình',
    quoteStatus: 'Đã gửi mẫu B',
    customerFeedback: 'Đang cân nhắc',
    crmAction: 'Chờ xác nhận',
    source: 'Manual',
    createdAt: new Date().toISOString()
  },
  {
    id: 'lead-3',
    companyName: 'Công ty Thương mại C',
    serviceNeed: 'Chỉ tham khảo giá',
    scale: 'Nhỏ / Không định kỳ',
    payment: 'Thấp',
    rating: 'Loại 3: Tiềm năng thấp',
    quoteStatus: 'Chưa gửi',
    customerFeedback: 'Chưa phản hồi',
    crmAction: 'Bỏ qua',
    source: 'Manual',
    createdAt: new Date().toISOString()
  }
];

const leadSchema = new mongoose.Schema({
  companyName: String,
  serviceNeed: String,
  scale: String,
  payment: String,
  rating: String,
  quoteStatus: String,
  customerFeedback: String,
  crmAction: String,
  source: String,
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const LeadModel = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

async function connectDatabase() {
  if (!MONGO_URI) {
    console.log('MONGO_URI not set. Using in-memory storage for demo mode.');
    return null;
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');
    return mongoose.connection;
  } catch (error) {
    console.warn('MongoDB connection failed, falling back to in-memory storage:', error.message);
    return null;
  }
}

async function listLeads() {
  if (!MONGO_URI) {
    return [...inMemoryLeads];
  }

  try {
    const docs = await LeadModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map(doc => ({ ...doc, id: String(doc._id) }));
  } catch (error) {
    console.warn('Read from MongoDB failed, fallback to in-memory');
    return [...inMemoryLeads];
  }
}

async function saveLead(data) {
  if (!MONGO_URI) {
    const lead = {
      id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    inMemoryLeads.unshift(lead);
    return lead;
  }

  try {
    const result = await LeadModel.create(data);
    return { ...result.toObject(), id: String(result._id) };
  } catch (error) {
    console.warn('Save to MongoDB failed, fallback to in-memory');
    const lead = {
      id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    inMemoryLeads.unshift(lead);
    return lead;
  }
}

async function updateLead(id, data) {
  if (!MONGO_URI) {
    const index = inMemoryLeads.findIndex(item => item.id === id);
    if (index === -1) return null;
    inMemoryLeads[index] = { ...inMemoryLeads[index], ...data };
    return inMemoryLeads[index];
  }

  try {
    const doc = await LeadModel.findByIdAndUpdate(id, data, { new: true }).lean();
    if (!doc) return null;
    return { ...doc, id: String(doc._id) };
  } catch (error) {
    console.warn('Update in MongoDB failed, fallback to in-memory');
    const index = inMemoryLeads.findIndex(item => item.id === id);
    if (index === -1) return null;
    inMemoryLeads[index] = { ...inMemoryLeads[index], ...data };
    return inMemoryLeads[index];
  }
}

async function deleteLead(id) {
  if (!MONGO_URI) {
    const index = inMemoryLeads.findIndex(item => item.id === id);
    if (index === -1) return false;
    inMemoryLeads.splice(index, 1);
    return true;
  }

  try {
    const doc = await LeadModel.findByIdAndDelete(id);
    return !!doc;
  } catch (error) {
    console.warn('Delete in MongoDB failed, fallback to in-memory');
    const index = inMemoryLeads.findIndex(item => item.id === id);
    if (index === -1) return false;
    inMemoryLeads.splice(index, 1);
    return true;
  }
}

function normalizeLeadPayload(body) {
  return {
    companyName: body.companyName || 'N/A',
    serviceNeed: body.serviceNeed || 'N/A',
    scale: body.scale || 'N/A',
    payment: body.payment || 'N/A',
    rating: body.rating || 'Loại 3: Tiềm năng thấp',
    quoteStatus: body.quoteStatus || 'Chưa gửi',
    customerFeedback: body.customerFeedback || 'Chưa phản hồi',
    crmAction: body.crmAction || 'Bỏ qua',
    source: body.source || 'Manual'
  };
}

app.get('/api/leads', async (req, res) => {
  const leads = await listLeads();
  res.json(leads);
});

app.get('/api/stats', async (req, res) => {
  const leads = await listLeads();
  const total = leads.length;
  const type1 = leads.filter(item => item.rating === 'Loại 1: Tiềm năng cao').length;
  const quoted = leads.filter(item => item.quoteStatus && item.quoteStatus !== 'Chưa gửi').length;
  const crmReady = leads.filter(item => item.crmAction === 'Đẩy qua CRM' || item.crmAction === 'Sẵn sàng chuyển CRM').length;

  res.json({
    total,
    type1,
    quoted,
    crmReady,
    max: 300
  });
});

app.post('/api/leads', async (req, res) => {
  const payload = normalizeLeadPayload(req.body);
  const lead = await saveLead(payload);
  res.status(201).json(lead);
});

app.put('/api/leads/:id', async (req, res) => {
  const id = req.params.id;
  const payload = normalizeLeadPayload(req.body);
  const lead = await updateLead(id, payload);
  if (!lead) {
    return res.status(404).json({ message: 'Lead not found' });
  }
  res.json(lead);
});

app.delete('/api/leads/:id', async (req, res) => {
  const ok = await deleteLead(req.params.id);
  if (!ok) {
    return res.status(404).json({ message: 'Lead not found' });
  }
  res.json({ message: 'Deleted successfully' });
});

app.post('/api/leads/import', async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : [];
  const created = [];

  for (const row of rows) {
    if (!row.companyName) continue;
    const payload = normalizeLeadPayload({
      companyName: row.companyName,
      serviceNeed: row.serviceNeed || row['Nhu cầu dịch vụ'] || 'N/A',
      scale: row.scale || row['Quy mô'] || 'N/A',
      payment: row.payment || row['Thanh toán'] || 'N/A',
      rating: row.rating || row['Đánh giá'] || 'Loại 3: Tiềm năng thấp',
      quoteStatus: row.quoteStatus || row['Trạng thái Báo giá'] || 'Chưa gửi',
      customerFeedback: row.customerFeedback || row['Phản hồi KH'] || 'Chưa phản hồi',
      crmAction: row.crmAction || row['Thao tác CRM'] || 'Bỏ qua',
      source: 'CSV Import'
    });
    created.push(await saveLead(payload));
  }

  res.status(201).json({ imported: created.length, leads: created });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
});
