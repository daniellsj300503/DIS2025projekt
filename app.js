var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var rateLimit = require('express-rate-limit');
var helmet = require('helmet');

// Mere rimelig rate limiting
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutter
  max: 100, // Øg til 100 forespørgsler
  message: {
    error: 'For mange forespørgsler. Vent venligst 15 minutter.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

var usersRouter = require('./disprojekt2025/routes/users');
var session = require('express-session');
var authRouter = require('./disprojekt2025/routes/auth');
var chatRouter = require('./disprojekt2025/routes/deepseek'); // Skift til deepseek
require('dotenv').config();
var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use(logger('dev'));
// Simpel sikkerheds middleware (standard headers)
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'din-hemmelige-nøgle-her',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 30 * 60 * 1000 // 30 minutter
  }
}));

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Brug rate limiting på chat API
app.use('/api/chat', chatLimiter);

// 🔴 BESKYTTEDE ROUTES
app.get('/forside.html', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'protected', 'forside.html'));
});

app.get('/forside', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'protected', 'forside.html'));
});

// 🔴 ROUTE FOR RODEN (/)
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/forside');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Brug routers
app.use('/auth', authRouter);
app.use('/api', chatRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  console.error(err);
  
  res.status(err.status || 500);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Fejl ${err.status || 500}</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            h1 { color: #d32f2f; }
            a { color: #1976d2; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <h1>${err.message}</h1>
        <h2>Status kode: ${err.status || 500}</h2>
        ${req.app.get('env') === 'development' ? `<pre>${err.stack}</pre>` : ''}
        <br><br>
        <a href="/">&#8592; Tilbage til forsiden</a>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server kører på http://0.0.0.0:${PORT}`);
});

module.exports = app;