import dotenv from 'dotenv';
import { generateSQL } from './utils/sqlGenerator.js';

dotenv.config();

async function testSQLGeneration() {
  try {
    const sql = await generateSQL("show me all users");
    console.log("Generated SQL:", sql);
  } catch (error) {
    console.error("Error:", error);
  }
}

testSQLGeneration();