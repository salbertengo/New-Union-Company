const express = require('express');
const authRoutes = require('./routes/authRoutes');
const inventoryRouter = require('./routes/inventoryRoutes');
const compatibilityRoutes = require('./routes/compatibilityRoutes');
const customerRoutes = require('./routes/customerRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const jobsheetRoutes = require('./routes/jobsheetRoutes');
const laborRoutes = require('./routes/laborRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');

const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors'); 

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

app.use(cors());


app.use('/auth', authRoutes);
app.use('/inventory', inventoryRouter);
app.use('/compatibility', compatibilityRoutes);
app.use('/customers', customerRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/jobsheets', jobsheetRoutes);
app.use('/labor', laborRoutes);
app.use('/users', userRoutes);
app.use('/reports', reportRoutes);app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Servidor corriendo en 0.0.0.0:3000');
});