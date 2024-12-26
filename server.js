const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./database');
const path = require('path');
const app = express();
const port = 3000;
const multer = require('multer');
const upload = multer({ dest: 'public/images/' });

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Session Setup
app.use(session({
  secret: 'grocerdashsecret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // For development, set secure: true for HTTPS
}));

// Home Route: Display products
app.get('/', (req, res) => {
  db.all('SELECT * FROM products', (err, products) => {
    if (err) {
      return res.status(500).send('Error fetching products');
    }
    res.render('home', { products, user: req.session.user });
  });
});
app.get('/home', (req, res) => {
    const products = [
      { id: 1, name: 'Apple', description: 'Fresh and juicy apples for your health.', price: 150.00, image: '/images/apple.jpg' },
      { id: 2, name: 'Banana', description: 'Ripe bananas, perfect for snacks or smoothies.', price: 40.00, image: '/images/banana.jpg' },
      { id: 3, name: 'Milk', description: 'Fresh milk for your breakfast.', price: 55.00, image: '/images/milk.jpg' },
      { id: 4, name: 'Bread', description: 'Freshly baked bread, perfect for sandwiches.', price: 35.00, image: '/images/bread.jpg' },
      { id: 5, name: 'Carrot', description: 'Fresh and crunchy carrots, great for salads.', price: 60.00, image: '/images/carrot.jpg' },
      { id: 6, name: 'Tomato', description: 'Fresh, juicy tomatoes for your meals.', price: 30.00, image: '/images/tomato.jpg' }
    ];
  
    // Pass the product data to the home page
    res.render('home', { user: req.session.user, products: products });
  });
  
  

// Login Route
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.status(401).send('User not found');
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        return res.status(401).send('Incorrect password');
      }

      req.session.user = user;
      res.redirect('/');
    });
  });
});

// Signup Route
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', (req, res) => {
  const { username, password } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).send('Error hashing password');
    }

    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
      if (err) {
        return res.status(500).send('Error saving user');
      }
      res.redirect('/login');
    });
  });
});

// Add to Cart Route
app.post('/cart', (req, res) => {
  if (!req.session.user) {
    return res.status(403).send('You need to be logged in to add items to the cart');
  }

  const { productId, quantity } = req.body;
  
  db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.session.user.id, productId, quantity], (err) => {
    if (err) {
      return res.status(500).send('Error adding product to cart');
    }
    res.redirect('/cart');
  });
});

// View Cart Route
app.get('/cart', (req, res) => {
  if (!req.session.user) {
    return res.status(403).send('You need to be logged in to view the cart');
  }

  db.all('SELECT * FROM cart WHERE user_id = ?', [req.session.user.id], (err, cartItems) => {
    if (err) {
      return res.status(500).send('Error fetching cart');
    }

    const productIds = cartItems.map(item => item.product_id);
    db.all('SELECT * FROM products WHERE id IN (?)', [productIds], (err, products) => {
      if (err) {
        return res.status(500).send('Error fetching products');
      }
      
      res.render('cart', { cartItems, products });
    });
  });
});


// Place Order Route
app.post('/order', (req, res) => {
    if (!req.session.user) {
      return res.status(403).send('You need to be logged in to place an order');
    }
  
    db.all('SELECT * FROM cart WHERE user_id = ?', [req.session.user.id], (err, cartItems) => {
      if (err || cartItems.length === 0) {
        return res.status(400).send('Your cart is empty');
      }
  
      const total = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  
      db.run('INSERT INTO orders (user_id, total, date) VALUES (?, ?, ?)', [req.session.user.id, total, new Date().toISOString()], (err) => {
        if (err) {
          return res.status(500).send('Error placing order');
        }
  
        // Clear cart after placing the order
        db.run('DELETE FROM cart WHERE user_id = ?', [req.session.user.id]);
  
        // Redirect to the order confirmation page
        res.render('order-confirmation');
      });
    });
  });
  

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
