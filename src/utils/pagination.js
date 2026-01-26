/**
 * Pagination Utility
 * Handles pagination logic for database queries
 */

/**
 * Get pagination parameters from request query
 * @param {object} query - Express request query object
 * @param {object} options - Default options
 * @returns {object} Pagination parameters
 */
const getPaginationParams = (query, options = {}) => {
    const {
        defaultLimit = 10,
        maxLimit = 100,
        defaultPage = 1,
    } = options;

    let page = parseInt(query.page) || defaultPage;
    let limit = parseInt(query.limit) || defaultLimit;

    // Ensure valid values
    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), maxLimit);

    const offset = (page - 1) * limit;

    return {
        page,
        limit,
        offset,
    };
};

/**
 * Create pagination metadata
 * @param {number} totalItems - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
const createPaginationMeta = (totalItems, page, limit) => {
    const totalPages = Math.ceil(totalItems / limit);

    return {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
    };
};

/**
 * Parse sort parameter
 * @param {string} sortParam - Sort parameter (field:direction)
 * @param {array} allowedFields - Allowed fields for sorting
 * @param {object} defaults - Default sort field and direction
 * @returns {object} Sort configuration
 */
const parseSortParam = (sortParam, allowedFields = [], defaults = {}) => {
    const defaultField = defaults.field || 'created_at';
    const defaultDirection = defaults.direction || 'DESC';

    if (!sortParam) {
        return {
            field: defaultField,
            direction: defaultDirection,
            sql: `${defaultField} ${defaultDirection}`,
        };
    }

    const [field, direction] = sortParam.split(':');
    const normalizedDirection = direction?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Validate field is allowed
    if (allowedFields.length > 0 && !allowedFields.includes(field)) {
        return {
            field: defaultField,
            direction: defaultDirection,
            sql: `${defaultField} ${defaultDirection}`,
        };
    }

    return {
        field,
        direction: normalizedDirection,
        sql: `${field} ${normalizedDirection}`,
    };
};

/**
 * Build pagination response
 * @param {array} data - Result data
 * @param {object} meta - Pagination metadata
 * @param {string} message - Optional message
 * @returns {object} Formatted response
 */
const buildPaginatedResponse = (data, meta, message = 'Data retrieved successfully') => {
    return {
        success: true,
        message,
        data,
        pagination: meta,
    };
};

/**
 * Get SQL LIMIT clause
 * @param {number} limit - Number of items
 * @param {number} offset - Offset
 * @returns {string} SQL LIMIT clause
 */
const getSQLLimit = (limit, offset) => {
    return `LIMIT ${limit} OFFSET ${offset}`;
};

module.exports = {
    getPaginationParams,
    createPaginationMeta,
    parseSortParam,
    buildPaginatedResponse,
    getSQLLimit,
};
