// Currency conversion utilities

// Exchange rates (can be updated or fetched from API)
const EXCHANGE_RATES = {
  JPY_TO_USD: 0.00685, // 1 JPY = 0.00685 USD (approximately 1 USD = 146 JPY)
  USD_TO_JPY: 146.0     // 1 USD = 146 JPY
};

/**
 * Convert JPY to USD
 * @param {number} jpyAmount - Amount in Japanese Yen
 * @returns {number} Amount in US Dollars
 */
export const convertJPYtoUSD = (jpyAmount) => {
  return parseFloat((jpyAmount * EXCHANGE_RATES.JPY_TO_USD).toFixed(2));
};

/**
 * Convert USD to JPY
 * @param {number} usdAmount - Amount in US Dollars
 * @returns {number} Amount in Japanese Yen
 */
export const convertUSDtoJPY = (usdAmount) => {
  return Math.round(usdAmount * EXCHANGE_RATES.USD_TO_JPY);
};

/**
 * Format JPY with Yen symbol
 * @param {number} amount - Amount in Yen
 * @returns {string} Formatted string (e.g., "¥10,000")
 */
export const formatJPY = (amount) => {
  return `¥${amount.toLocaleString('ja-JP')}`;
};

/**
 * Format USD with Dollar symbol
 * @param {number} amount - Amount in Dollars
 * @returns {string} Formatted string (e.g., "$68.50")
 */
export const formatUSD = (amount) => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Display price in both JPY and USD
 * @param {number} jpyAmount - Amount in Japanese Yen
 * @param {boolean} showUSD - Whether to show USD conversion
 * @returns {object} Object with formatted JPY and USD strings
 */
export const formatDualCurrency = (jpyAmount, showUSD = true) => {
  const usdAmount = convertJPYtoUSD(jpyAmount);
  return {
    jpy: formatJPY(jpyAmount),
    usd: formatUSD(usdAmount),
    jpyRaw: jpyAmount,
    usdRaw: usdAmount
  };
};

/**
 * Get currency symbol
 * @param {string} currency - Currency code (JPY or USD)
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currency) => {
  const symbols = {
    JPY: '¥',
    USD: '$',
    AUD: '$'
  };
  return symbols[currency] || currency;
};

export default {
  convertJPYtoUSD,
  convertUSDtoJPY,
  formatJPY,
  formatUSD,
  formatDualCurrency,
  getCurrencySymbol,
  EXCHANGE_RATES
};
