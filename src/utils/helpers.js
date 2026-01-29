const crypto = require('crypto');

/**
 * Generate a unique UUID
 * @returns {string} UUID v4
 */
const generateUUID = () => {
    return crypto.randomUUID();
};

/**
 * Generate a URL-friendly slug from text
 * @param {string} text - Text to convert to slug
 * @param {string} suffix - Optional suffix to append
 * @returns {string} URL-friendly slug
 */
const generateSlug = (text, suffix = null) => {
    let slug = text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text

    if (suffix) {
        slug = `${slug}-${suffix}`;
    }

    return slug;
};

/**
 * Generate a unique slug by appending a short UUID
 * @param {string} text - Text to convert to slug
 * @returns {string} Unique slug
 */
const generateUniqueSlug = (text) => {
    const baseSlug = generateSlug(text);
    const shortId = uuidv4().split('-')[0]; // First segment of UUID
    return `${baseSlug}-${shortId}`;
};

/**
 * Sanitize output data by removing sensitive fields
 * @param {object} data - Data object to sanitize
 * @param {array} sensitiveFields - Fields to remove
 * @returns {object} Sanitized data
 */
const sanitizeOutput = (data, sensitiveFields = ['password', 'refresh_token', 'password_reset_token']) => {
    if (Array.isArray(data)) {
        return data.map(item => sanitizeOutput(item, sensitiveFields));
    }

    if (typeof data !== 'object' || data === null) {
        return data;
    }

    const sanitized = { ...data };
    sensitiveFields.forEach(field => {
        delete sanitized[field];
    });

    return sanitized;
};

/**
 * Parse JSON fields from database results
 * @param {object} row - Database row
 * @param {array} jsonFields - Fields to parse as JSON
 * @returns {object} Row with parsed JSON fields
 */
const parseJSONFields = (row, jsonFields = []) => {
    if (!row) return row;

    const parsed = { ...row };
    jsonFields.forEach(field => {
        if (parsed[field] && typeof parsed[field] === 'string') {
            try {
                parsed[field] = JSON.parse(parsed[field]);
            } catch (e) {
                // Keep original value if parsing fails
            }
        }
    });

    return parsed;
};

/**
 * Convert object keys from snake_case to camelCase
 * @param {object} obj - Object to convert
 * @returns {object} Object with camelCase keys
 */
const toCamelCase = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(item => toCamelCase(item));
    }

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const camelObj = {};
    Object.keys(obj).forEach(key => {
        const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        camelObj[camelKey] = obj[key];
    });

    return camelObj;
};

/**
 * Convert object keys from camelCase to snake_case
 * @param {object} obj - Object to convert
 * @returns {object} Object with snake_case keys
 */
const toSnakeCase = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(item => toSnakeCase(item));
    }

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const snakeObj = {};
    Object.keys(obj).forEach(key => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeObj[snakeKey] = obj[key];
    });

    return snakeObj;
};

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
const calculatePercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
};

/**
 * Format duration from seconds to human readable
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
};

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
};

/**
 * Pick specific keys from an object
 * @param {object} obj - Source object
 * @param {array} keys - Keys to pick
 * @returns {object} Object with only specified keys
 */
const pick = (obj, keys) => {
    return keys.reduce((acc, key) => {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
            acc[key] = obj[key];
        }
        return acc;
    }, {});
};

/**
 * Omit specific keys from an object
 * @param {object} obj - Source object
 * @param {array} keys - Keys to omit
 * @returns {object} Object without specified keys
 */
const omit = (obj, keys) => {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
};

/**
 * Delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    generateUUID,
    generateSlug,
    generateUniqueSlug,
    sanitizeOutput,
    parseJSONFields,
    toCamelCase,
    toSnakeCase,
    calculatePercentage,
    formatDuration,
    deepClone,
    isEmpty,
    pick,
    omit,
    delay,
};
