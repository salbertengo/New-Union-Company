const express = require('express');
const authRoutes = require('./routes/authRoutes');
const inventoryRouter = require('./routes/inventoryRoutes');
const compatibilityRoutes = require('./routes/compatibilityRoutes');
const customerRoutes = require('./routes/customerRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const jobsheetRoutes = require('./routes/jobsheetRoutes');
const laborRoutes = require('./routes/laborRoutes');
const userRoutes = require('./routes/userRoutes');

const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors'); 

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.use('/auth', authRoutes);
app.use('/inventory', inventoryRouter);
app.use('/compatibility', compatibilityRoutes);
app.use('/customers', customerRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/jobsheets', jobsheetRoutes);
app.use('/labor', laborRoutes);
app.use('/users', userRoutes);
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(3000, () => {
});