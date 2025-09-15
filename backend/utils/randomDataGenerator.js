// backend/utils/randomDataGenerator.js
// Utility for generating realistic random data for demo databases

// Simple random data generators without external dependencies
const firstNames = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah', 
  'Ian', 'Julia', 'Kevin', 'Laura', 'Michael', 'Nina', 'Oliver', 'Paula',
  'Quinn', 'Rachel', 'Samuel', 'Tina', 'Ulysses', 'Victoria', 'William', 'Xara',
  'Yolanda', 'Zachary', 'Amy', 'Ben', 'Catherine', 'David', 'Emma', 'Frank'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

const cities = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
  'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville',
  'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville'
];

const countries = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy',
  'Spain', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Australia', 'Japan', 'South Korea', 'Singapore', 'Switzerland', 'Austria'
];

const productCategories = [
  'Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys',
  'Beauty', 'Automotive', 'Health', 'Food', 'Office', 'Jewelry'
];

const orderStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];

// Helper functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'company.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${getRandomElement(domains)}`;
}

function getRandomPhone() {
  return `+1-${getRandomNumber(200, 999)}-${getRandomNumber(100, 999)}-${getRandomNumber(1000, 9999)}`;
}

function getRandomPrice(min = 10, max = 1000) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function getRandomDate(daysAgo = 365) {
  const date = new Date();
  date.setDate(date.getDate() - getRandomNumber(0, daysAgo));
  return date.toISOString().split('T')[0];
}

// Generate random data for demo database
function generateRandomData() {
  const data = {
    customers: [],
    products: [],
    orders: []
  };

  // Generate customers (50-100)
  const customerCount = getRandomNumber(50, 100);
  for (let i = 0; i < customerCount; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    data.customers.push({
      id: i + 1,
      name: `${firstName} ${lastName}`,
      email: getRandomEmail(firstName, lastName),
      phone: getRandomPhone(),
      city: getRandomElement(cities),
      country: getRandomElement(countries),
      created_at: getRandomDate(730) // Past 2 years
    });
  }

  // Generate products (30-60)
  const productCount = getRandomNumber(30, 60);
  const productNames = [
    'Wireless Headphones', 'Smart Watch', 'Laptop Stand', 'Coffee Maker', 'Bluetooth Speaker',
    'Phone Case', 'Desk Lamp', 'Wireless Mouse', 'Keyboard', 'Monitor', 'Tablet', 'Camera',
    'Fitness Tracker', 'Gaming Chair', 'External Hard Drive', 'USB Cable', 'Power Bank',
    'VR Headset', 'Drone', 'Action Camera', 'Smart Home Hub', 'Robot Vacuum', 'Air Purifier',
    'Electric Toothbrush', 'Hair Dryer', 'Straightener', 'Makeup Mirror', 'Jewelry Box',
    'Backpack', 'Sneakers', 'T-Shirt', 'Jeans', 'Jacket', 'Sunglasses', 'Watch', 'Ring',
    'Necklace', 'Earrings', 'Bracelet', 'Scarf', 'Hat', 'Gloves', 'Belt', 'Wallet'
  ];
  
  for (let i = 0; i < productCount; i++) {
    data.products.push({
      id: i + 1,
      name: getRandomElement(productNames),
      description: `High-quality ${getRandomElement(productNames).toLowerCase()} with excellent features and durability.`,
      price: getRandomPrice(10, 1000),
      category: getRandomElement(productCategories),
      stock_quantity: getRandomNumber(1, 100),
      created_at: getRandomDate(365) // Past year
    });
  }

  // Generate orders (100-200)
  const orderCount = getRandomNumber(100, 200);
  for (let i = 0; i < orderCount; i++) {
    const customerId = getRandomNumber(1, customerCount);
    const productId = getRandomNumber(1, productCount);
    const quantity = getRandomNumber(1, 5);
    const product = data.products.find(p => p.id === productId);
    const totalAmount = product ? (product.price * quantity) : 0;

    data.orders.push({
      id: i + 1,
      customer_id: customerId,
      product_id: productId,
      quantity: quantity,
      total_amount: parseFloat(totalAmount.toFixed(2)),
      order_date: getRandomDate(365), // Past year
      status: getRandomElement(orderStatuses)
    });
  }

  return data;
}

// Generate SQL INSERT statements for the data
function generateInsertStatements(data) {
  const statements = [];

  // Customers
  statements.push('-- Insert customers');
  data.customers.forEach(customer => {
    statements.push(
      `INSERT INTO customers (id, name, email, phone, city, country, created_at) VALUES ` +
      `(${customer.id}, '${customer.name.replace(/'/g, "''")}', '${customer.email}', ` +
      `'${customer.phone}', '${customer.city.replace(/'/g, "''")}', '${customer.country.replace(/'/g, "''")}', '${customer.created_at}');`
    );
  });

  // Products
  statements.push('\n-- Insert products');
  data.products.forEach(product => {
    statements.push(
      `INSERT INTO products (id, name, description, price, category, stock_quantity, created_at) VALUES ` +
      `(${product.id}, '${product.name.replace(/'/g, "''")}', '${product.description.replace(/'/g, "''")}', ` +
      `${product.price}, '${product.category}', ${product.stock_quantity}, '${product.created_at}');`
    );
  });

  // Orders
  statements.push('\n-- Insert orders');
  data.orders.forEach(order => {
    statements.push(
      `INSERT INTO orders (id, customer_id, product_id, quantity, total_amount, order_date, status) VALUES ` +
      `(${order.id}, ${order.customer_id}, ${order.product_id}, ${order.quantity}, ` +
      `${order.total_amount}, '${order.order_date}', '${order.status}');`
    );
  });

  return statements.join('\n');
}

module.exports = {
  generateRandomData,
  generateInsertStatements
};
