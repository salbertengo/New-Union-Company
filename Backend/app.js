//// filepath: /c:/Users/salbe/OneDrive/Escritorio/New Union Company/Backend/app.js
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const inventoryRouter = require('./routes/inventoryRoutes');
const compatibilityRoutes = require('./routes/compatibilityRoutes');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importa el módulo cors

const app = express();
app.use(bodyParser.json());

app.use(cors({
  origin: 'http://localhost:4000', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.use('/auth', authRoutes);
app.use('/inventory', inventoryRouter);
app.use('/compatibility', compatibilityRoutes);

app.listen(3000, () => {
  console.log('Servidor en http://localhost:3000');

});