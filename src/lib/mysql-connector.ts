
import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'matiasfmart',
  database: 'grace_hub_db', // Make sure this database exists
  connectionLimit: 10,
};

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (pool) {
    return pool;
  }
  pool = mysql.createPool(MYSQL_CONFIG);
  return pool;
}

export async function executeQuery<T>(
  sql: string,
  params?: any[]
): Promise<T> {
  const connectionPool = getPool();
  let connection;
  try {
    connection = await connectionPool.getConnection();
    const [results] = await connection.execute(sql, params);
    return results as T;
  } catch (error) {
    console.error('MySQL Query Error:', error);
    throw error; // Re-throw the error to be handled by the caller
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Helper to format multiple result sets from SP calls
// MySQL SPs can return multiple result sets.
// The actual data is usually in the first set, and subsequent sets might be metadata or output parameters.
export function getRowsAndTotal<T>(
  results: any[]
): { rows: T[]; totalCount: number } {
  if (!Array.isArray(results) || results.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  const dataRows = results[0] as T[]; // Actual data
  let totalCount = dataRows.length; // Default if no specific count is returned

  // Check if the second result set contains a total count (common pattern for pagination SPs)
  if (results.length > 1 && Array.isArray(results[1]) && results[1].length === 1) {
    const countResult = results[1][0] as any;
    if (countResult && typeof countResult.totalMembers === 'number') {
      totalCount = countResult.totalMembers;
    } else if (countResult && typeof countResult.totalCount === 'number') {
      totalCount = countResult.totalCount;
    }
  }
  return { rows: dataRows, totalCount };
}


// Example of how to call a stored procedure:
// const members = await executeQuery<Member[]>('CALL sp_GetAllMembers(?, ?, ?)', [page, pageSize, searchTerm]);
// const { rows, totalCount } = getRowsAndTotal<Member>(results);

    