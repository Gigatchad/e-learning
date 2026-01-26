/**
 * Query Builder Utility
 * Helps build dynamic SQL queries with filtering and sorting
 */

/**
 * Build WHERE clause from filter object
 * @param {object} filters - Filter object
 * @param {object} fieldMappings - Map of filter keys to database columns
 * @returns {object} { whereClause, params }
 */
const buildWhereClause = (filters, fieldMappings = {}) => {
    const conditions = [];
    const params = [];

    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;

        const column = fieldMappings[key] || key;

        if (typeof value === 'object' && !Array.isArray(value)) {
            // Handle operators
            if (value.$eq !== undefined) {
                conditions.push(`${column} = ?`);
                params.push(value.$eq);
            }
            if (value.$ne !== undefined) {
                conditions.push(`${column} != ?`);
                params.push(value.$ne);
            }
            if (value.$gt !== undefined) {
                conditions.push(`${column} > ?`);
                params.push(value.$gt);
            }
            if (value.$gte !== undefined) {
                conditions.push(`${column} >= ?`);
                params.push(value.$gte);
            }
            if (value.$lt !== undefined) {
                conditions.push(`${column} < ?`);
                params.push(value.$lt);
            }
            if (value.$lte !== undefined) {
                conditions.push(`${column} <= ?`);
                params.push(value.$lte);
            }
            if (value.$like !== undefined) {
                conditions.push(`${column} LIKE ?`);
                params.push(`%${value.$like}%`);
            }
            if (value.$in !== undefined && Array.isArray(value.$in)) {
                const placeholders = value.$in.map(() => '?').join(', ');
                conditions.push(`${column} IN (${placeholders})`);
                params.push(...value.$in);
            }
            if (value.$between !== undefined && Array.isArray(value.$between)) {
                conditions.push(`${column} BETWEEN ? AND ?`);
                params.push(value.$between[0], value.$between[1]);
            }
        } else if (Array.isArray(value)) {
            // Handle array as IN clause
            const placeholders = value.map(() => '?').join(', ');
            conditions.push(`${column} IN (${placeholders})`);
            params.push(...value);
        } else {
            // Simple equality
            conditions.push(`${column} = ?`);
            params.push(value);
        }
    });

    return {
        whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params,
    };
};

/**
 * Build search condition for multiple columns
 * @param {string} searchTerm - Search term
 * @param {array} columns - Columns to search in
 * @returns {object} { searchClause, params }
 */
const buildSearchClause = (searchTerm, columns = []) => {
    if (!searchTerm || columns.length === 0) {
        return { searchClause: '', params: [] };
    }

    const conditions = columns.map(col => `${col} LIKE ?`);
    const params = columns.map(() => `%${searchTerm}%`);

    return {
        searchClause: `(${conditions.join(' OR ')})`,
        params,
    };
};

/**
 * Build ORDER BY clause
 * @param {string} sortField - Field to sort by
 * @param {string} sortDirection - Sort direction (ASC/DESC)
 * @param {array} allowedFields - Allowed fields for sorting
 * @param {string} defaultField - Default sort field
 * @returns {string} ORDER BY clause
 */
const buildOrderByClause = (sortField, sortDirection, allowedFields = [], defaultField = 'created_at') => {
    const field = allowedFields.includes(sortField) ? sortField : defaultField;
    const direction = sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return `ORDER BY ${field} ${direction}`;
};

/**
 * Build complete SELECT query
 * @param {object} options - Query options
 * @returns {object} { query, params, countQuery, countParams }
 */
const buildSelectQuery = (options) => {
    const {
        table,
        columns = '*',
        joins = '',
        filters = {},
        search = null,
        searchColumns = [],
        sortField = 'created_at',
        sortDirection = 'DESC',
        allowedSortFields = [],
        limit = 10,
        offset = 0,
        fieldMappings = {},
        groupBy = '',
        having = '',
    } = options;

    const selectColumns = Array.isArray(columns) ? columns.join(', ') : columns;

    // Build WHERE clause
    const { whereClause, params } = buildWhereClause(filters, fieldMappings);

    // Build search clause
    const { searchClause, params: searchParams } = buildSearchClause(search, searchColumns);

    // Combine WHERE conditions
    let finalWhereClause = '';
    const allParams = [...params, ...searchParams];

    if (whereClause && searchClause) {
        finalWhereClause = `${whereClause} AND ${searchClause}`;
    } else if (whereClause) {
        finalWhereClause = whereClause;
    } else if (searchClause) {
        finalWhereClause = `WHERE ${searchClause}`;
    }

    // Build ORDER BY
    const orderByClause = buildOrderByClause(sortField, sortDirection, allowedSortFields);

    // Build main query
    const query = `
        SELECT ${selectColumns}
        FROM ${table}
        ${joins}
        ${finalWhereClause}
        ${groupBy}
        ${having}
        ${orderByClause}
        LIMIT ? OFFSET ?
    `.trim().replace(/\s+/g, ' ');

    // Build count query
    const countQuery = `
        SELECT COUNT(*) as total
        FROM ${table}
        ${joins}
        ${finalWhereClause}
        ${groupBy}
    `.trim().replace(/\s+/g, ' ');

    return {
        query,
        params: [...allParams, limit, offset],
        countQuery,
        countParams: allParams,
    };
};

/**
 * Build INSERT query
 * @param {string} table - Table name
 * @param {object} data - Data to insert
 * @returns {object} { query, params }
 */
const buildInsertQuery = (table, data) => {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const params = Object.values(data);

    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    return { query, params };
};

/**
 * Build UPDATE query
 * @param {string} table - Table name
 * @param {object} data - Data to update
 * @param {object} where - WHERE conditions
 * @returns {object} { query, params }
 */
const buildUpdateQuery = (table, data, where) => {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const setParams = Object.values(data);

    const whereConditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const whereParams = Object.values(where);

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereConditions}`;

    return {
        query,
        params: [...setParams, ...whereParams],
    };
};

module.exports = {
    buildWhereClause,
    buildSearchClause,
    buildOrderByClause,
    buildSelectQuery,
    buildInsertQuery,
    buildUpdateQuery,
};
