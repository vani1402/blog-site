const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const tagRoutes = require('./routes/tags');
const commentRoutes = require('./routes/comments');

const app = express();
app.use(cors());
app.use(express.json());

// health check - useful for Docker/Jenkins/K8s readiness checks
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/comments', commentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
