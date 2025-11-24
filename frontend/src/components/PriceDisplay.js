import React from 'react';
import { formatDualCurrency } from '../utils/currency';

/**
 * Component to display prices in both JPY and USD
 * Primary currency (JPY) is shown larger, USD is shown smaller underneath
 */
const PriceDisplay = ({ 
  price, 
  currency = 'JPY', 
  showUSD = true,
  size = 'md',
  className = '' 
}) => {
  // If price is in USD, don't show conversion for now
  if (currency === 'USD') {
    return (
      <div className={className}>
        <span className={getSizeClass(size)}>${price.toFixed(2)}</span>
      </div>
    );
  }

  // Default: Price is in JPY
  const { jpy, usd } = formatDualCurrency(price, showUSD);

  return (
    <div className={`${className} flex flex-col`}>
      <span className={`font-bold ${getSizeClass(size)}`}>
        {jpy}
      </span>
      {showUSD && (
        <span className={`text-slate-500 ${getUSDSizeClass(size)}`}>
          ~{usd} USD
        </span>
      )}
    </div>
  );
};

/**
 * Get text size class based on size prop
 */
const getSizeClass = (size) => {
  const sizes = {
    'sm': 'text-sm',
    'md': 'text-lg',
    'lg': 'text-2xl',
    'xl': 'text-3xl'
  };
  return sizes[size] || sizes['md'];
};

/**
 * Get USD text size class (always smaller than JPY)
 */
const getUSDSizeClass = (size) => {
  const sizes = {
    'sm': 'text-xs',
    'md': 'text-sm',
    'lg': 'text-base',
    'xl': 'text-lg'
  };
  return sizes[size] || sizes['md'];
};

export default PriceDisplay;
