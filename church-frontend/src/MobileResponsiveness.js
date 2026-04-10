import React, { useEffect, useState } from 'react';

/**
 * Mobile Responsiveness Hook & Utilities
 * Provides reactive breakpoint detection and mobile-optimized styling
 */

export const BREAKPOINTS = {
  mobile390: 390,
  mobile420: 420,
  mobile520: 520,
  tablet600: 600,
  tablet680: 680,
  desktop900: 900,
  desktop1920: 1920
};

/**
 * Custom hook to detect current breakpoint
 */
export function useMobileBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 'desktop900';
    const width = window.innerWidth;
    if (width <= 390) return 'mobile390';
    if (width <= 420) return 'mobile420';
    if (width <= 520) return 'mobile520';
    if (width <= 600) return 'tablet600';
    if (width <= 680) return 'tablet680';
    if (width <= 900) return 'desktop900';
    return 'desktop1920';
  });

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const [isMobile, setIsMobile] = useState(windowWidth <= 900);
  const [isTablet, setIsTablet] = useState(windowWidth > 600 && windowWidth <= 900);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width <= 900);
      setIsTablet(width > 600 && width <= 900);

      if (width <= 390) setBreakpoint('mobile390');
      else if (width <= 420) setBreakpoint('mobile420');
      else if (width <= 520) setBreakpoint('mobile520');
      else if (width <= 600) setBreakpoint('tablet600');
      else if (width <= 680) setBreakpoint('tablet680');
      else if (width <= 900) setBreakpoint('desktop900');
      else setBreakpoint('desktop1920');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { breakpoint, windowWidth, isMobile, isTablet };
}

/**
 * Get responsive values based on breakpoint
 */
export function getResponsiveValue(breakpoint, values) {
  const defaults = {
    mobile390: values.mobile390 || values.mobile420 || values.mobile520 || values.default,
    mobile420: values.mobile420 || values.mobile520 || values.default,
    mobile520: values.mobile520 || values.tablet600 || values.default,
    tablet600: values.tablet600 || values.tablet680 || values.default,
    tablet680: values.tablet680 || values.desktop900 || values.default,
    desktop900: values.desktop900 || values.desktop1920 || values.default,
    desktop1920: values.desktop1920 || values.default
  };
  return defaults[breakpoint];
}

/**
 * Mobile-optimized modal styling
 */
export function getMobileModalStyles(breakpoint) {
  return {
    mobile390: {
      maxWidth: '100vw',
      width: 'calc(100vw - 16px)',
      maxHeight: '90vh',
      padding: '12px',
      borderRadius: '12px',
      fontSize: '13px'
    },
    mobile420: {
      maxWidth: 'min(100vw - 16px, 420px)',
      width: '100%',
      maxHeight: '90vh',
      padding: '14px',
      borderRadius: '14px',
      fontSize: '13px'
    },
    mobile520: {
      maxWidth: 'min(100vw - 20px, 480px)',
      width: '100%',
      maxHeight: '88vh',
      padding: '16px',
      borderRadius: '16px',
      fontSize: '14px'
    },
    tablet600: {
      maxWidth: 'min(100vw - 20px, 480px)',
      width: '100%',
      maxHeight: '85vh',
      padding: '16px',
      borderRadius: '16px',
      fontSize: '14px'
    },
    tablet680: {
      maxWidth: '500px',
      width: '100%',
      maxHeight: '85vh',
      padding: '18px',
      borderRadius: '18px',
      fontSize: '15px'
    },
    desktop900: {
      maxWidth: '500px',
      width: '100%',
      maxHeight: '85vh',
      padding: '20px',
      borderRadius: '20px',
      fontSize: '16px'
    },
    desktop1920: {
      maxWidth: '550px',
      width: '100%',
      maxHeight: '90vh',
      padding: '24px',
      borderRadius: '24px',
      fontSize: '16px'
    }
  }[breakpoint] || {
    maxWidth: '500px',
    width: '100%',
    padding: '20px',
    borderRadius: '20px',
    fontSize: '16px'
  };
}

/**
 * Mobile-optimized button sizing
 */
export function getMobileButtonStyles(breakpoint, isSmall = false) {
  const sizes = {
    mobile390: {
      normal: { padding: '8px 12px', fontSize: '12px', minHeight: '36px', borderRadius: '6px' },
      small: { padding: '6px 8px', fontSize: '11px', minHeight: '32px', borderRadius: '4px' }
    },
    mobile420: {
      normal: { padding: '9px 14px', fontSize: '12px', minHeight: '36px', borderRadius: '6px' },
      small: { padding: '7px 10px', fontSize: '12px', minHeight: '32px', borderRadius: '4px' }
    },
    mobile520: {
      normal: { padding: '10px 16px', fontSize: '13px', minHeight: '40px', borderRadius: '8px' },
      small: { padding: '8px 12px', fontSize: '12px', minHeight: '34px', borderRadius: '6px' }
    },
    tablet600: {
      normal: { padding: '10px 16px', fontSize: '14px', minHeight: '40px', borderRadius: '8px' },
      small: { padding: '8px 12px', fontSize: '13px', minHeight: '36px', borderRadius: '6px' }
    },
    tablet680: {
      normal: { padding: '11px 18px', fontSize: '14px', minHeight: '42px', borderRadius: '8px' },
      small: { padding: '9px 14px', fontSize: '13px', minHeight: '38px', borderRadius: '6px' }
    },
    desktop900: {
      normal: { padding: '12px 20px', fontSize: '15px', minHeight: '44px', borderRadius: '8px' },
      small: { padding: '10px 16px', fontSize: '14px', minHeight: '40px', borderRadius: '6px' }
    },
    desktop1920: {
      normal: { padding: '12px 22px', fontSize: '16px', minHeight: '44px', borderRadius: '8px' },
      small: { padding: '10px 18px', fontSize: '14px', minHeight: '40px', borderRadius: '6px' }
    }
  };
  return sizes[breakpoint]?.[isSmall ? 'small' : 'normal'] || sizes.desktop900.normal;
}

/**
 * Mobile-optimized input field sizing
 */
export function getMobileInputStyles(breakpoint) {
  return {
    mobile390: {
      padding: '8px 10px',
      fontSize: '14px',
      minHeight: '36px',
      borderRadius: '6px'
    },
    mobile420: {
      padding: '9px 11px',
      fontSize: '14px',
      minHeight: '38px',
      borderRadius: '6px'
    },
    mobile520: {
      padding: '10px 12px',
      fontSize: '14px',
      minHeight: '40px',
      borderRadius: '8px'
    },
    tablet600: {
      padding: '10px 12px',
      fontSize: '14px',
      minHeight: '40px',
      borderRadius: '8px'
    },
    tablet680: {
      padding: '10px 12px',
      fontSize: '15px',
      minHeight: '42px',
      borderRadius: '8px'
    },
    desktop900: {
      padding: '10px 12px',
      fontSize: '15px',
      minHeight: '44px',
      borderRadius: '8px'
    },
    desktop1920: {
      padding: '10px 12px',
      fontSize: '16px',
      minHeight: '44px',
      borderRadius: '8px'
    }
  }[breakpoint] || {
    padding: '10px 12px',
    fontSize: '15px',
    minHeight: '44px',
    borderRadius: '8px'
  };
}

/**
 * Mobile-optimized card padding
 */
export function getMobileCardStyles(breakpoint) {
  return {
    mobile390: {
      padding: '12px',
      borderRadius: '12px',
      gap: '8px'
    },
    mobile420: {
      padding: '14px',
      borderRadius: '14px',
      gap: '10px'
    },
    mobile520: {
      padding: '16px',
      borderRadius: '16px',
      gap: '12px'
    },
    tablet600: {
      padding: '16px',
      borderRadius: '16px',
      gap: '12px'
    },
    tablet680: {
      padding: '18px',
      borderRadius: '18px',
      gap: '14px'
    },
    desktop900: {
      padding: '20px',
      borderRadius: '20px',
      gap: '16px'
    },
    desktop1920: {
      padding: '24px',
      borderRadius: '24px',
      gap: '16px'
    }
  }[breakpoint] || {
    padding: '20px',
    borderRadius: '20px',
    gap: '16px'
  };
}

/**
 * Mobile-optimized font sizes
 */
export function getMobileFontSizes(breakpoint) {
  return {
    mobile390: { h1: '18px', h2: '16px', body: '13px', small: '11px' },
    mobile420: { h1: '19px', h2: '17px', body: '13px', small: '12px' },
    mobile520: { h1: '20px', h2: '18px', body: '14px', small: '12px' },
    tablet600: { h1: '22px', h2: '19px', body: '14px', small: '13px' },
    tablet680: { h1: '24px', h2: '20px', body: '14px', small: '13px' },
    desktop900: { h1: '26px', h2: '21px', body: '15px', small: '13px' },
    desktop1920: { h1: '28px', h2: '22px', body: '16px', small: '14px' }
  }[breakpoint] || { h1: '26px', h2: '21px', body: '15px', small: '13px' };
}

/**
 * Mobile-optimized spacing (margin/padding scale)
 */
export function getMobileSpacing(breakpoint) {
  return {
    mobile390: { xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
    mobile420: { xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
    mobile520: { xs: '6px', sm: '8px', md: '10px', lg: '14px', xl: '18px' },
    tablet600: { xs: '6px', sm: '8px', md: '10px', lg: '14px', xl: '18px' },
    tablet680: { xs: '8px', sm: '10px', md: '12px', lg: '16px', xl: '20px' },
    desktop900: { xs: '8px', sm: '10px', md: '12px', lg: '16px', xl: '20px' },
    desktop1920: { xs: '8px', sm: '12px', md: '16px', lg: '20px', xl: '24px' }
  }[breakpoint] || { xs: '8px', sm: '10px', md: '12px', lg: '16px', xl: '20px' };
}

/**
 * Helper to check if device is touch-enabled
 */
export function isTouchDevice() {
  return typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

export default {
  BREAKPOINTS,
  useMobileBreakpoint,
  getResponsiveValue,
  getMobileModalStyles,
  getMobileButtonStyles,
  getMobileInputStyles,
  getMobileCardStyles,
  getMobileFontSizes,
  getMobileSpacing,
  isTouchDevice
};
