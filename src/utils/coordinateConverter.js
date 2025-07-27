// Coordinate conversion utilities for responsive positioning

// Original map dimensions (the actual map size your paths are designed for)
const ORIGINAL_MAP_WIDTH = 1536;  // Your actual map width
const ORIGINAL_MAP_HEIGHT = 703;  // Your actual map height

/**
 * Convert pixel coordinates to relative coordinates (0-1)
 * @param {number} pixelX - X coordinate in pixels
 * @param {number} pixelY - Y coordinate in pixels
 * @returns {Object} - Relative coordinates {x, y}
 */
export const pixelToRelative = (pixelX, pixelY) => {
  return {
    x: pixelX / ORIGINAL_MAP_WIDTH,
    y: pixelY / ORIGINAL_MAP_HEIGHT
  };
};

/**
 * Convert relative coordinates (0-1) to pixel coordinates
 * @param {number} relativeX - X coordinate as percentage (0-1)
 * @param {number} relativeY - Y coordinate as percentage (0-1)
 * @param {number} containerWidth - Current container width
 * @param {number} containerHeight - Current container height
 * @returns {Object} - Pixel coordinates {x, y}
 */
export const relativeToPixel = (relativeX, relativeY, containerWidth, containerHeight) => {
  return {
    x: relativeX * containerWidth,
    y: relativeY * containerHeight
  };
};

/**
 * Convert all path coordinates from pixel to relative
 * @param {Object} paths - Original paths object with pixel coordinates
 * @returns {Object} - Paths object with relative coordinates
 */
export const convertPathsToRelative = (paths) => {
  const convertedPaths = {};
  
  Object.keys(paths).forEach(pathName => {
    convertedPaths[pathName] = paths[pathName].map(point => ({
      ...point,
      ...pixelToRelative(point.x, point.y)
    }));
  });
  
  return convertedPaths;
};

/**
 * Get current viewport dimensions
 * @returns {Object} - Current viewport size {width, height}
 */
export const getViewportSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

/**
 * Get map container dimensions (for more precise positioning)
 * @param {HTMLElement} mapContainer - Reference to map container element
 * @returns {Object} - Map container size {width, height}
 */
export const getMapContainerSize = (mapContainer) => {
  if (!mapContainer) {
    return getViewportSize();
  }
  
  const rect = mapContainer.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height
  };
};

/**
 * Test function to verify coordinate conversion
 * @param {number} testViewportWidth - Test viewport width
 * @param {number} testViewportHeight - Test viewport height
 */
export const testCoordinateConversion = (testViewportWidth = 1536, testViewportHeight = 703) => {
  console.log('🧪 Testing Coordinate Conversion:');
  console.log(`Test viewport: ${testViewportWidth}x${testViewportHeight}`);
  console.log(`Original dimensions: ${ORIGINAL_MAP_WIDTH}x${ORIGINAL_MAP_HEIGHT}`);
  
  // Test a sample coordinate from the actual paths
  const originalPixel = { x: 987, y: 323 };
  const relative = pixelToRelative(originalPixel.x, originalPixel.y);
  const convertedPixel = relativeToPixel(relative.x, relative.y, testViewportWidth, testViewportHeight);
  
  console.log(`Original pixel: ${originalPixel.x}, ${originalPixel.y}`);
  console.log(`Relative: ${relative.x.toFixed(3)}, ${relative.y.toFixed(3)}`);
  console.log(`Converted pixel: ${convertedPixel.x.toFixed(1)}, ${convertedPixel.y.toFixed(1)}`);
  
  const errorX = Math.abs(originalPixel.x - convertedPixel.x);
  const errorY = Math.abs(originalPixel.y - convertedPixel.y);
  
  console.log(`Error: ${errorX.toFixed(1)}px X, ${errorY.toFixed(1)}px Y`);
  
  // Test with your actual viewport size
  const actualConverted = relativeToPixel(relative.x, relative.y, 1536, 703);
  console.log(`For 1536x703 viewport: ${actualConverted.x.toFixed(1)}, ${actualConverted.y.toFixed(1)}`);
  
  return { originalPixel, relative, convertedPixel, errorX, errorY };
}; 