📝 Dell–Tsofen API Documentation (API\_DOCS.md)

---

### POST /users

* Description: Create a new user account.
* Request:

  ```json
  {
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "securepassword"
  }
  ```
* Response:

  ```json
  {
    "message": "User account created successfully",
    "user_id": 1
  }
  ```

---

### GET /users

* Description: Fetch all registered users.
* Response:

  ```json
  [
    {"id": 1, "username": "saleh", "email": "saleh@example.com"},
    {"id": 2, "username": "newuser", "email": "newuser@example.com"}
  ]
  ```

---

### PUT /users/{id}

* Description: Update user account information.
* Request:

  ```json
  {
    "username": "updateduser",
    "email": "updated@example.com"
  }
  ```
* Response:

  ```json
  {
    "message": "User information updated successfully"
  }
  ```

---

### POST /upload-database

* Description: Upload a database file for querying.
* Request:

  ```json
  {
    "file": "example.db"
  }
  ```
* Response:

  ```json
  {
    "message": "Database uploaded successfully"
  }
  ```

---

### GET /databases

* Description: Retrieve a list of available databases.
* Response:

  ```json
  [
    {"id": 1, "name": "sales_2025.db"},
    {"id": 2, "name": "customers.db"}
  ]
  ```

---

### POST /query

* Description: Submit a natural language query and get results.
* Request:

  ```json
  {
    "database_id": 1,
    "prompt": "Get top 5 selling products this year"
  }
  ```
* Response:

  ```json
  {
    "sql": "SELECT name, SUM(sales) FROM products WHERE year=2025 GROUP BY name ORDER BY SUM(sales) DESC LIMIT 5;",
    "results": [
      {"name": "Product A", "SUM(sales)": 5000},
      {"name": "Product B", "SUM(sales)": 4200}
    ]
  }
  ```

---

### PUT /edit-sql

* Description: Edit the generated SQL for a previous query.
* Request:

  ```json
  {
    "history_id": 1,
    "sql": "SELECT name, SUM(sales) as total_sales FROM products WHERE year=2025 GROUP BY name ORDER BY total_sales DESC LIMIT 5;"
  }
  ```
* Response:

  ```json
  {
    "message": "SQL updated and executed successfully",
    "results": [
      {"name": "Product A", "total_sales": 5000},
      {"name": "Product B", "total_sales": 4200}
    ]
  }
  ```

---

### GET /history

* Description: Retrieve past queries and their results.
* Response:

  ```json
  [
    {
      "prompt": "Get top 5 selling products this year",
      "sql": "SELECT name, SUM(sales) FROM products WHERE year=2025 GROUP BY name ORDER BY SUM(sales) DESC LIMIT 5;",
      "results": [
        {"name": "Product A", "SUM(sales)": 5000},
        {"name": "Product B", "SUM(sales)": 4200}
      ]
    }
  ]
  ```

---

### GET /results/export

* Description: Export results of a previous query.
* Request Parameters:

  * `history_id` (required): ID of the query to export.
  * `format` (optional): CSV or JSON (default CSV).
* Response: File download of results.

---

### GET /suggestions

* Description: Provide auto-suggestions while typing a prompt.
* Request Parameters:

  * `input` (string): Current text typed by user.
* Response:

  ```json
  {
    "suggestions": [
      "Show total sales by region",
      "Show sales trend over months",
      "List top customers"
    ]
  }
  ```

---

### GET /status

* Description: Check system health and database availability.
* Response:

  ```json
  {
    "status": "ok",
    "database_loaded": true
  }
  ```
