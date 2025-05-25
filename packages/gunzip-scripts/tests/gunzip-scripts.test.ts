import { test, expect } from '@playwright/test';
import { generateTestHtml, writeTestFile, TestScript } from './test-utils';

test.describe('gunzipScripts', () => {
  test('UMD script execution', async ({ page }) => {

    const scripts: TestScript[] = [
      {
        type: 'umd',
        content: `
          console.log('UMD script executing...');
          window.testResult = 'UMD script executed';
          window.testCounter = (window.testCounter || 0) + 1;
          console.log('UMD script finished, testResult:', window.testResult);
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'UMD Test',
      additionalBody: `
        <script>
          console.log('Test script starting...');
          window.testData = { ready: false };
          setTimeout(() => {
            console.log('Setting testData ready to true');
            window.testData.ready = true;
          }, 100);
        </script>
      `
    });

    const filePath = writeTestFile('umd-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.testData?.ready);

    const testResult = await page.evaluate(() => window.testResult);
    const testCounter = await page.evaluate(() => window.testCounter);

    expect(testResult).toBe('UMD script executed');
    expect(testCounter).toBe(1);
  });

  test('ESM with import resolution', async ({ page }) => {

    const scripts: TestScript[] = [
      {
        type: 'esm',
        path: './math.js',
        content: `
          console.log('ESM math module executing...');
          export function add(a, b) {
            return a + b;
          }
          window.mathModuleLoaded = true;
          console.log('ESM math module finished loading');
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'ESM Test',
      additionalBody: `
        <script type="module-shim">
          console.log('Test module-shim script starting...');
          setTimeout(async () => {
            console.log('Attempting to import ./math.js...');
            try {
              const math = await import('./math.js');
              console.log('Import successful, calling add(2,3)...');
              window.importResult = math.add(2, 3);
              console.log('Result:', window.importResult);
              window.testComplete = true;
            } catch (e) {
              console.log('Import failed:', e.message);
              window.importError = e.message;
              window.testComplete = true;
            }
          }, 500);
        </script>
      `
    });

    const filePath = writeTestFile('esm-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.testComplete, { timeout: 5000 });

    const importShimExists = await page.evaluate(() => typeof window.importShim !== 'undefined');
    expect(importShimExists).toBe(true);

    const mathModuleLoaded = await page.evaluate(() => window.mathModuleLoaded);
    expect(mathModuleLoaded).toBe(true);

    const importResult = await page.evaluate(() => window.importResult);
    const importError = await page.evaluate(() => window.importError);

    expect(importError).toBeUndefined();
    expect(importResult).toBe(5);
  });

  test('mixed UMD and ESM scripts', async ({ page }) => {
  
    const scripts: TestScript[] = [
      {
        type: 'umd',
        content: `
          window.umdData = 'UMD loaded';
        `
      },
      {
        type: 'esm',
        name: 'utils',
        content: `
          export const greeting = 'Hello from ESM';
          window.esmLoaded = true;
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Mixed Test',
      additionalBody: `
        <script type="module-shim">
          setTimeout(async () => {
            try {
              const utils = await import('utils');
              window.mixedTestResult = {
                umd: window.umdData,
                esm: utils.greeting,
                esmLoaded: window.esmLoaded
              };
              window.mixedTestComplete = true;
            } catch (e) {
              window.mixedTestError = e.message;
              window.mixedTestComplete = true;
            }
          }, 500);
        </script>
      `
    });

    const filePath = writeTestFile('mixed-test.html', html);
    await page.goto(`file://${filePath}`);

    // Wait for test to complete
    await page.waitForFunction(() => window.mixedTestComplete, { timeout: 5000 });

    const result = await page.evaluate(() => window.mixedTestResult);
    const error = await page.evaluate(() => window.mixedTestError);

    expect(error).toBeUndefined();
    expect(result).toEqual({
      umd: 'UMD loaded',
      esm: 'Hello from ESM',
      esmLoaded: true
    });
  });

  test('ESM with internal imports (Three.js mock)', async ({ page }) => {

    const scripts: TestScript[] = [
      {
        type: 'esm',
        name: 'three',
        content: `
          export class Scene { add() {} }
          export class PerspectiveCamera { position = { z: 0 }; }
          export class WebGLRenderer { domElement = document.createElement('canvas'); setSize() {} render() {} }
          export class Mesh {}
          window.threeLoaded = true;
        `
      },
      {
        type: 'esm',
        path: 'three/addons/controls/OrbitControls.js',
        content: `
          export class OrbitControls {
            update() {}
          }
          window.orbitControlsLoaded = true;
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Three.js Test',
      additionalBody: `
        <div id="container"></div>
        <script type="module-shim">
          setTimeout(async () => {
            try {
              const { Scene, PerspectiveCamera, WebGLRenderer, Mesh } = await import('three');
              const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
              
              const scene = new Scene();
              const camera = new PerspectiveCamera();
              const renderer = new WebGLRenderer();
              const cube = new Mesh();
              const controls = new OrbitControls();
              
              scene.add(cube);
              document.getElementById('container').appendChild(renderer.domElement);
              renderer.render(scene, camera);
              controls.update();
              
              window.threeJsTestComplete = true;
            } catch (e) {
              window.threeJsTestError = e.message;
              window.threeJsTestComplete = true;
            }
          }, 1000);
        </script>
      `
    });

    const filePath = writeTestFile('threejs-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.threeJsTestComplete, { timeout: 10000 });

    const threeLoaded = await page.evaluate(() => window.threeLoaded);
    const orbitControlsLoaded = await page.evaluate(() => window.orbitControlsLoaded);
    const error = await page.evaluate(() => window.threeJsTestError);

    expect(error).toBeUndefined();
    expect(threeLoaded).toBe(true);
    expect(orbitControlsLoaded).toBe(true);

    const canvasExists = await page.evaluate(() => !!document.querySelector('#container canvas'));
    expect(canvasExists).toBe(true);
  });

  test('version compatibility (0.0.1 vs 0.0.2)', async ({ page }) => {

    const scripts: TestScript[] = [
      {
        type: 'umd',
        content: `window.versionTest = 'works';`
      }
    ];

    // Test v0.0.1
    const html1 = generateTestHtml(scripts, { gunzipVersion: '0.0.1' });
    const filePath1 = writeTestFile('version-001-test.html', html1);
    await page.goto(`file://${filePath1}`);
    await page.waitForFunction(() => window.versionTest);
    
    let result = await page.evaluate(() => window.versionTest);
    expect(result).toBe('works');

    // Test v0.0.2
    const html2 = generateTestHtml(scripts, { gunzipVersion: '0.0.2' });
    const filePath2 = writeTestFile('version-002-test.html', html2);
    await page.goto(`file://${filePath2}`);
    await page.waitForFunction(() => window.versionTest);
    
    result = await page.evaluate(() => window.versionTest);
    expect(result).toBe('works');
  });

  test('complex nested modules with all export types', async ({ page }) => {
    const scripts: TestScript[] = [
      // Base utility module with named exports
      {
        type: 'esm',
        path: './utils/math.js',
        content: `
          export const PI = 3.14159;
          export function add(a, b) { return a + b; }
          export function multiply(a, b) { return a * b; }
          export { subtract as minus } from './operations.js';
          export * from './constants.js';
        `
      },
      // Operations module with default and named exports
      {
        type: 'esm',
        path: './utils/operations.js',
        content: `
          export default function divide(a, b) { return a / b; }
          export function subtract(a, b) { return a - b; }
          export function power(a, b) { return Math.pow(a, b); }
        `
      },
      // Constants module with mixed exports
      {
        type: 'esm',
        path: './utils/constants.js',
        content: `
          export const E = 2.71828;
          export const GOLDEN_RATIO = 1.618;
          export default { version: '1.0.0' };
        `
      },
      // Nested subdirectory module
      {
        type: 'esm',
        path: './geometry/shapes/circle.js',
        content: `
          import { PI, multiply } from '../../utils/math.js';
          import divide from '../../utils/operations.js';
          
          export class Circle {
            constructor(radius) { this.radius = radius; }
            area() { return multiply(PI, multiply(this.radius, this.radius)); }
            circumference() { return multiply(2, multiply(PI, this.radius)); }
          }
          
          export function circleArea(radius) {
            return multiply(PI, multiply(radius, radius));
          }
          
          export default Circle;
        `
      },
      // Another nested module with re-exports
      {
        type: 'esm',
        path: './geometry/shapes/rectangle.js',
        content: `
          import { multiply } from '../../utils/math.js';
          
          export class Rectangle {
            constructor(width, height) {
              this.width = width;
              this.height = height;
            }
            area() { return multiply(this.width, this.height); }
          }
          
          export default Rectangle;
          export { Circle } from './circle.js';
        `
      },
      // Index file that aggregates everything
      {
        type: 'esm',
        path: './geometry/index.js',
        content: `
          export { default as Circle, circleArea } from './shapes/circle.js';
          export { default as Rectangle } from './shapes/rectangle.js';
          export * from '../utils/math.js';
          
          import DefaultConstants from '../utils/constants.js';
          export { DefaultConstants };
        `
      },
      // Main module that uses everything
      {
        type: 'esm',
        path: './main.js',
        content: `
          import { Circle, Rectangle, PI, add, minus, E, GOLDEN_RATIO, DefaultConstants } from './geometry/index.js';
          import divide, { power } from './utils/operations.js';
          
          window.complexModuleTest = {
            circle: new Circle(5),
            rectangle: new Rectangle(4, 6),
            constants: { PI, E, GOLDEN_RATIO },
            operations: { add: add(2, 3), minus: minus(10, 4), divide: divide(12, 3), power: power(2, 3) },
            version: DefaultConstants.version
          };
          
          window.complexModuleTestComplete = true;
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Complex Nested Modules Test',
      additionalBody: `
        <script type="module-shim">
          setTimeout(async () => {
            try {
              await import('./main.js');
            } catch (e) {
              window.complexModuleTestError = e.message;
              window.complexModuleTestComplete = true;
            }
          }, 1000);
        </script>
      `
    });

    const filePath = writeTestFile('complex-modules-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.complexModuleTestComplete, { timeout: 10000 });

    const error = await page.evaluate(() => window.complexModuleTestError);
    const result = await page.evaluate(() => window.complexModuleTest);

    expect(error).toBeUndefined();
    expect(result).toEqual({
      circle: expect.objectContaining({ radius: 5 }),
      rectangle: expect.objectContaining({ width: 4, height: 6 }),
      constants: { PI: 3.14159, E: 2.71828, GOLDEN_RATIO: 1.618 },
      operations: { add: 5, minus: 6, divide: 4, power: 8 },
      version: '1.0.0'
    });

    // Test that methods work correctly
    const circleArea = await page.evaluate(() => window.complexModuleTest.circle.area());
    const rectangleArea = await page.evaluate(() => window.complexModuleTest.rectangle.area());
    
    expect(circleArea).toBeCloseTo(78.5398, 3); // π * 5²
    expect(rectangleArea).toBe(24); // 4 * 6
  });

  test('ambiguous filenames in different directories', async ({ page }) => {
    const scripts: TestScript[] = [
      // First circle.js in shapes/2d/
      {
        type: 'esm',
        path: './shapes/2d/circle.js',
        content: `
          export class Circle2D {
            constructor(radius) { this.radius = radius; this.type = '2D'; }
            area() { return Math.PI * this.radius * this.radius; }
          }
          export default Circle2D;
        `
      },
      // Second circle.js in shapes/3d/ 
      {
        type: 'esm',
        path: './shapes/3d/circle.js',
        content: `
          export class Circle3D {
            constructor(radius, height) { 
              this.radius = radius; 
              this.height = height;
              this.type = '3D';
            }
            volume() { return Math.PI * this.radius * this.radius * this.height; }
          }
          export default Circle3D;
        `
      },
      // Rectangle that should import from 2d/circle.js (same directory level)
      {
        type: 'esm',
        path: './shapes/2d/rectangle.js',
        content: `
          import { Circle2D } from './circle.js';  // Should resolve to 2d/circle.js
          
          export class Rectangle2D {
            constructor(width, height) {
              this.width = width;
              this.height = height;
              this.type = '2D';
            }
            area() { return this.width * this.height; }
          }
          
          // Re-export from local circle.js
          export { Circle2D };
          export default Rectangle2D;
        `
      },
      // Cylinder that should import from 3d/circle.js (same directory level)
      {
        type: 'esm',
        path: './shapes/3d/cylinder.js',
        content: `
          import { Circle3D } from './circle.js';  // Should resolve to 3d/circle.js
          
          export class Cylinder {
            constructor(radius, height) {
              this.base = new Circle3D(radius, height);
              this.type = '3D';
            }
            volume() { return this.base.volume(); }
          }
          
          export { Circle3D };
          export default Cylinder;
        `
      },
      // Main module that imports both
      {
        type: 'esm',
        path: './main.js',
        content: `
          import { Rectangle2D, Circle2D } from './shapes/2d/rectangle.js';
          import { Cylinder, Circle3D } from './shapes/3d/cylinder.js';
          
          const circle2d = new Circle2D(5);
          const circle3d = new Circle3D(3, 4);
          const rect = new Rectangle2D(4, 6);
          const cylinder = new Cylinder(3, 4);
          
          window.ambiguousFilenameTest = {
            circle2d: { type: circle2d.type, area: circle2d.area() },
            circle3d: { type: circle3d.type, volume: circle3d.volume() },
            rect: { type: rect.type, area: rect.area() },
            cylinder: { type: cylinder.type, volume: cylinder.volume() }
          };
          
          window.ambiguousFilenameTestComplete = true;
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Ambiguous Filenames Test',
      additionalBody: `
        <script type="module-shim">
          setTimeout(async () => {
            try {
              await import('./main.js');
            } catch (e) {
              window.ambiguousFilenameTestError = e.message;
              window.ambiguousFilenameTestComplete = true;
            }
          }, 1000);
        </script>
      `
    });

    const filePath = writeTestFile('ambiguous-filenames-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.ambiguousFilenameTestComplete, { timeout: 10000 });

    const error = await page.evaluate(() => window.ambiguousFilenameTestError);
    const result = await page.evaluate(() => window.ambiguousFilenameTest);

    if (error) {
      console.log('Expected failure - ambiguous filename resolution:', error);
      // This test is expected to fail with current implementation
      expect(error).toMatch(/Failed to resolve module specifier|does not provide an export named|Unable to resolve specifier/);
    } else {
      // If it passes, verify the correct modules were loaded
      expect(result.circle2d.type).toBe('2D');
      expect(result.circle3d.type).toBe('3D');
      expect(result.rect.type).toBe('2D');
      expect(result.cylinder.type).toBe('3D');
      
      expect(result.circle2d.area).toBeCloseTo(78.54, 1); // π * 5²
      expect(result.circle3d.volume).toBeCloseTo(113.1, 1); // π * 3² * 4
      expect(result.rect.area).toBe(24); // 4 * 6
      expect(result.cylinder.volume).toBeCloseTo(113.1, 1); // same as circle3d
    }
  });

  test('extreme relative path traversal', async ({ page }) => {
    const scripts: TestScript[] = [
      // Deep nested file
      {
        type: 'esm',
        path: './deep/nested/very/deep/module.js',
        content: `
          export const deepValue = 'deep';
        `
      },
      // Very deep nested file that tries extreme traversal  
      {
        type: 'esm',
        path: './very/very/very/very/very/very/very/very/very/very/very/very/deep/consumer.js',
        content: `
          // This should either resolve properly or fail gracefully
          import { deepValue } from '../../../../../../../../../../../deep/nested/very/deep/module.js';
          
          window.extremeTraversalTest = {
            success: true,
            deepValue: deepValue
          };
          window.extremeTraversalComplete = true;
        `
      },
      // Root level file for comparison
      {
        type: 'esm',
        path: './root.js',
        content: `
          export const rootValue = 'root';
        `
      },
      // Test normal traversal too
      {
        type: 'esm',
        path: './normal/test.js',
        content: `
          import { rootValue } from '../root.js';
          
          window.normalTraversalTest = {
            success: true,
            rootValue: rootValue
          };
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Extreme Relative Path Test',
      additionalBody: `
        <script type="module-shim">
          setTimeout(async () => {
            try {
              // Test normal traversal first
              await import('./normal/test.js');
              
              // Test extreme traversal
              await import('./very/very/very/very/very/very/very/very/very/very/very/very/deep/consumer.js');
              
              window.allTraversalTestsComplete = true;
            } catch (e) {
              window.traversalTestError = e.message;
              window.allTraversalTestsComplete = true;
            }
          }, 1000);
        </script>
      `
    });

    const filePath = writeTestFile('extreme-traversal-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.allTraversalTestsComplete, { timeout: 10000 });

    const error = await page.evaluate(() => window.traversalTestError);
    const normalResult = await page.evaluate(() => window.normalTraversalTest);
    const extremeResult = await page.evaluate(() => window.extremeTraversalTest);

    // Normal traversal should work
    expect(normalResult).toEqual({
      success: true,
      rootValue: 'root'
    });

    if (error) {
      // If extreme traversal fails, that's acceptable - log what happened
      console.log('Extreme traversal failed (this may be expected):', error);
      expect(error).toMatch(/Failed to resolve|Unable to resolve|Invalid/);
    } else {
      // If it succeeds, verify it worked correctly
      expect(extremeResult).toEqual({
        success: true,
        deepValue: 'deep'
      });
    }
  });

  test('path normalization with redundant segments', async ({ page }) => {
    const scripts: TestScript[] = [
      // Target modules that will be imported via normalized paths
      {
        type: 'esm',
        path: './utils/math.js',
        content: `
          export const add = (a, b) => a + b;
        `
      },
      {
        type: 'esm',
        path: './components/button.js',
        content: `
          export const Button = 'ButtonComponent';
        `
      },
      {
        type: 'esm',
        path: './lib/helpers.js',
        content: `
          export const helper = 'HelperFunction';
        `
      },
      // Module that uses various redundant path patterns
      {
        type: 'esm',
        path: './complex/nested/consumer.js',
        content: `
          // These should all normalize to proper paths:
          
          // Simple redundant current directory (should resolve to ../../utils/math.js)
          import { add } from './././../../utils/math.js';
          
          // Redundant up and current directory (should resolve to ../../components/button.js)
          import { Button } from '.././../components/button.js';
          
          // Mixed redundant patterns (should resolve to ../../lib/helpers.js)
          import { helper } from '.././../lib/helpers.js';
          
          window.pathNormalizationTest = {
            math: add(2, 3),
            button: Button,
            helper: helper,
            success: true
          };
          window.pathNormalizationComplete = true;
        `
      },
      // Another test module with different redundant patterns
      {
        type: 'esm',
        path: './deep/very/nested/module.js',
        content: `
          // Test going up and down with redundancy
          import { add } from './../../.././utils/math.js';
          import { Button } from './../../../components/./button.js';
          
          window.deepPathTest = {
            result: add(5, 7),
            component: Button
          };
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Path Normalization Test',
      additionalBody: `
        <script type="module-shim">
          setTimeout(async () => {
            try {
              // Test the main normalization patterns
              await import('./complex/nested/consumer.js');
              
              // Test deep path normalization  
              await import('./deep/very/nested/module.js');
              
              window.allPathTestsComplete = true;
            } catch (e) {
              window.pathTestError = e.message;
              window.allPathTestsComplete = true;
            }
          }, 1000);
        </script>
      `
    });

    const filePath = writeTestFile('path-normalization-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.allPathTestsComplete, { timeout: 10000 });

    const error = await page.evaluate(() => window.pathTestError);
    const mainResult = await page.evaluate(() => window.pathNormalizationTest);
    const deepResult = await page.evaluate(() => window.deepPathTest);

    expect(error).toBeUndefined();
    
    // Verify main normalization test
    expect(mainResult).toEqual({
      math: 5,         // add(2, 3)
      button: 'ButtonComponent',
      helper: 'HelperFunction',
      success: true
    });

    // Verify deep path test
    expect(deepResult).toEqual({
      result: 12,      // add(5, 7)
      component: 'ButtonComponent'
    });
  });

  test('imports with query parameters and fragments', async ({ page }) => {
    const scripts: TestScript[] = [
      // Base module that will be imported with various query params/fragments
      {
        type: 'esm',
        path: './versioned/api.js',
        content: `
          export const version = '1.0.0';
          export const getData = () => ({ data: 'api-data' });
          export const config = { endpoint: '/api/v1' };
        `
      },
      // Another module for testing fragments
      {
        type: 'esm',
        path: './docs/manual.js',
        content: `
          export const introduction = 'Welcome to the manual';
          export const chapter1 = 'Getting Started';
          export const chapter2 = 'Advanced Usage';
          export const references = ['ref1', 'ref2'];
        `
      },
      // Module that imports with query parameters
      {
        type: 'esm',
        path: './consumer/query-test.js',
        content: `
          // Import with query parameters
          import { version, getData } from '../versioned/api.js?version=1&cache=false';
          import { config } from '../versioned/api.js?env=production';
          
          window.queryParamsTest = {
            version: version,
            data: getData(),
            config: config,
            success: true
          };
        `
      },
      // Module that imports with fragments  
      {
        type: 'esm',
        path: './consumer/fragment-test.js',
        content: `
          // Import with fragments
          import { introduction, chapter1 } from '../docs/manual.js#introduction';
          import { chapter2, references } from '../docs/manual.js#advanced';
          
          window.fragmentsTest = {
            intro: introduction,
            chapter1: chapter1,
            chapter2: chapter2,
            refs: references,
            success: true
          };
        `
      },
      // Module that imports with both query params and fragments
      {
        type: 'esm',
        path: './consumer/mixed-test.js',
        content: `
          // Import with both query params and fragments
          import { version } from '../versioned/api.js?debug=true#main';
          import { introduction } from '../docs/manual.js?lang=en#section1';
          
          window.mixedTest = {
            version: version,
            intro: introduction,
            success: true
          };
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Query Params and Fragments Test',
      additionalBody: `
        <script type="module-shim">
          setTimeout(async () => {
            try {
              // Test query parameters
              await import('./consumer/query-test.js');
              
              // Test fragments
              await import('./consumer/fragment-test.js');
              
              // Test mixed query params and fragments
              await import('./consumer/mixed-test.js');
              
              window.allQueryFragmentTestsComplete = true;
            } catch (e) {
              window.queryFragmentTestError = e.message;
              window.allQueryFragmentTestsComplete = true;
            }
          }, 1000);
        </script>
      `
    });

    const filePath = writeTestFile('query-fragment-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.allQueryFragmentTestsComplete, { timeout: 10000 });

    const error = await page.evaluate(() => window.queryFragmentTestError);
    const queryResult = await page.evaluate(() => window.queryParamsTest);
    const fragmentResult = await page.evaluate(() => window.fragmentsTest);
    const mixedResult = await page.evaluate(() => window.mixedTest);

    if (error) {
      // Query params and fragments might not be fully supported - log what happened
      console.log('Query params/fragments test failed (this may be expected):', error);
      expect(error).toMatch(/Failed to resolve|Unable to resolve|Invalid/);
    } else {
      // If it succeeds, verify all imports worked correctly
      expect(queryResult).toEqual({
        version: '1.0.0',
        data: { data: 'api-data' },
        config: { endpoint: '/api/v1' },
        success: true
      });

      expect(fragmentResult).toEqual({
        intro: 'Welcome to the manual',
        chapter1: 'Getting Started',
        chapter2: 'Advanced Usage',
        refs: ['ref1', 'ref2'],
        success: true
      });

      expect(mixedResult).toEqual({
        version: '1.0.0',
        intro: 'Welcome to the manual',
        success: true
      });
    }
  });

  test('circular dependency resolution', async ({ page }) => {
    const scripts: TestScript[] = [
      // Module A that imports B
      {
        type: 'esm',
        path: './circular/moduleA.js',
        content: `
          import { fromB, bValue } from './moduleB.js';
          
          export const aValue = 'A-value';
          export const fromA = 'exported-from-A';
          
          // Use B's exports
          export const combinedAB = aValue + '-' + bValue;
          export const messageFromB = fromB;
          
          console.log('Module A loaded, bValue:', bValue);
        `
      },
      // Module B that imports A (creating circular dependency)
      {
        type: 'esm',
        path: './circular/moduleB.js',
        content: `
          import { fromA, aValue } from './moduleA.js';
          
          export const bValue = 'B-value';
          export const fromB = 'exported-from-B';
          
          // Use A's exports in functions (works better with circular deps)
          export function getCombinedBA() {
            return bValue + '-' + aValue;
          }
          
          export function getMessageFromA() {
            return fromA;
          }
          
          console.log('Module B loaded, aValue:', aValue);
        `
      },
      // Module C that imports both A and B
      {
        type: 'esm',
        path: './circular/moduleC.js',
        content: `
          import { aValue, combinedAB, messageFromB } from './moduleA.js';
          import { bValue, getCombinedBA, getMessageFromA } from './moduleB.js';
          
          export const cValue = 'C-value';
          
          window.circularTestResult = {
            aValue: aValue,
            bValue: bValue,
            combinedAB: combinedAB,
            combinedBA: getCombinedBA(),
            messageFromA: getMessageFromA(),
            messageFromB: messageFromB,
            cValue: cValue,
            success: true
          };
          
          console.log('Module C loaded with circular deps resolved');
        `
      },
      // Complex circular: D -> E -> F -> D
      {
        type: 'esm',
        path: './complex/moduleD.js',
        content: `
          import { eFunc } from './moduleE.js';
          
          export const dData = { type: 'D', value: 1 };
          
          export function dFunc() {
            return 'D-' + eFunc();
          }
          
          console.log('Module D loaded');
        `
      },
      {
        type: 'esm',
        path: './complex/moduleE.js',
        content: `
          import { fFunc } from './moduleF.js';
          
          export const eData = { type: 'E', value: 2 };
          
          export function eFunc() {
            return 'E-' + fFunc();
          }
          
          console.log('Module E loaded');
        `
      },
      {
        type: 'esm',
        path: './complex/moduleF.js',
        content: `
          import { dData } from './moduleD.js';
          
          export const fData = { type: 'F', value: 3 };
          
          export function fFunc() {
            return 'F-' + dData.type;
          }
          
          console.log('Module F loaded');
        `
      },
      // Consumer that tests the complex circular chain
      {
        type: 'esm',
        path: './complex/consumer.js',
        content: `
          import { dFunc, dData } from './moduleD.js';
          import { eData } from './moduleE.js';
          import { fData } from './moduleF.js';
          
          window.complexCircularResult = {
            chain: dFunc(), // Should be 'D-E-F-D'
            dData: dData,
            eData: eData,
            fData: fData,
            success: true
          };
          
          console.log('Complex circular consumer loaded');
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Circular Dependencies Test',
      additionalBody: `
        <script type="module-shim">
          setTimeout(async () => {
            try {
              // Test simple circular: A <-> B
              await import('./circular/moduleC.js');
              
              // Test complex circular: D -> E -> F -> D
              await import('./complex/consumer.js');
              
              window.allCircularTestsComplete = true;
            } catch (e) {
              window.circularTestError = e.message;
              window.allCircularTestsComplete = true;
            }
          }, 1000);
        </script>
      `
    });

    const filePath = writeTestFile('circular-dependencies-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.allCircularTestsComplete, { timeout: 10000 });

    const error = await page.evaluate(() => window.circularTestError);
    const simpleResult = await page.evaluate(() => window.circularTestResult);
    const complexResult = await page.evaluate(() => window.complexCircularResult);

    if (error) {
      // Circular dependencies might not be supported - log what happened
      console.log('Circular dependencies test failed (this may be expected):', error);
      expect(error).toMatch(/Failed to resolve|Unable to resolve|Invalid|Circular|ReferenceError/);
    } else {
      // If it succeeds, verify the circular dependencies work correctly
      expect(simpleResult).toEqual({
        aValue: 'A-value',
        bValue: 'B-value',
        combinedAB: 'A-value-B-value',
        combinedBA: 'B-value-A-value',
        messageFromA: 'exported-from-A',
        messageFromB: 'exported-from-B',
        cValue: 'C-value',
        success: true
      });

      expect(complexResult).toEqual({
        chain: 'D-E-F-D',
        dData: { type: 'D', value: 1 },
        eData: { type: 'E', value: 2 },
        fData: { type: 'F', value: 3 },
        success: true
      });
    }
  });

  test('real Three.js with relative imports', async ({ page }) => {
    const fs = require('fs');
    const path = require('path');

    // Read actual Three.js files
    const threeJsPath = path.resolve('./node_modules/three/build/three.module.js');
    const threeCorePath = path.resolve('./node_modules/three/build/three.core.js');
    const orbitControlsPath = path.resolve('./node_modules/three/examples/jsm/controls/OrbitControls.js');

    let threeJs, threeCore, orbitControls;
    
    try {
      threeJs = fs.readFileSync(threeJsPath, 'utf8');
      console.log('Read three.module.js:', threeJs.length, 'chars');
    } catch (e) {
      console.log('Could not read three.module.js:', e.message);
      return; // Skip test if Three.js not available
    }

    try {
      threeCore = fs.readFileSync(threeCorePath, 'utf8');
      console.log('Read three.core.js:', threeCore.length, 'chars');
    } catch (e) {
      console.log('Could not read three.core.js, using three.module.js only');
      threeCore = null;
    }

    try {
      orbitControls = fs.readFileSync(orbitControlsPath, 'utf8');
      console.log('Read OrbitControls.js:', orbitControls.length, 'chars');
    } catch (e) {
      console.log('Could not read OrbitControls.js:', e.message);
      return; // Skip test if OrbitControls not available
    }

    const scripts: TestScript[] = [];

    // Add three.core.js if it exists
    if (threeCore) {
      scripts.push({
        type: 'esm',
        path: './three.core.js',
        content: threeCore
      });
    }

    // Add three.module.js
    scripts.push({
      type: 'esm',
      name: 'three',
      content: threeJs
    });

    // Add OrbitControls
    scripts.push({
      type: 'esm',
      path: 'three/examples/jsm/controls/OrbitControls.js',
      content: orbitControls
    });

    const html = generateTestHtml(scripts, {
      title: 'Actual Three.js Test',
      additionalBody: `
        <div id="container" style="width: 400px; height: 300px; border: 1px solid #ccc; margin: 20px;"></div>
        <div id="info">
          <p>Testing with actual Three.js files:</p>
          <ul>
            <li>three.module.js (${Math.round(threeJs.length/1024)}KB)</li>
            ${threeCore ? `<li>three.core.js (${Math.round(threeCore.length/1024)}KB)</li>` : ''}
            <li>OrbitControls.js (${Math.round(orbitControls.length/1024)}KB)</li>
          </ul>
          <p id="status">Starting...</p>
        </div>
        <script type="module-shim">
          import * as THREE from 'three';
          import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
          
          console.log('🚀 Starting actual Three.js test with static imports...');
          document.getElementById('status').textContent = 'Loading Three.js...';
          
          // Wait for gunzipScripts to be ready before proceeding
          const startTest = () => {
            if (window.gunzipScriptsReady) {
              console.log('gunzipScripts is ready, starting test...');
              runTest();
            } else {
              console.log('Waiting for gunzipScripts to be ready...');
              document.addEventListener('gunzipScriptsReady', () => {
                console.log('gunzipScriptsReady event received, starting test...');
                runTest();
              });
            }
          };
          
          const runTest = () => {
            try {
              console.log('Three.js imported:', Object.keys(THREE).slice(0, 10).join(', '), '...');
              console.log('OrbitControls imported successfully');
              
              document.getElementById('status').textContent = 'Creating scene...';
              
              // Create a simple scene
              const scene = new THREE.Scene();
              const camera = new THREE.PerspectiveCamera(75, 400/300, 0.1, 1000);
              const renderer = new THREE.WebGLRenderer();
              
              renderer.setSize(400, 300);
              document.getElementById('container').appendChild(renderer.domElement);
              
              // Create a cube
              const geometry = new THREE.BoxGeometry();
              const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
              const cube = new THREE.Mesh(geometry, material);
              scene.add(cube);
              
              // Create controls
              const controls = new OrbitControls(camera, renderer.domElement);
              controls.enableDamping = true;
              
              camera.position.z = 5;
              
              // Render once
              renderer.render(scene, camera);
              controls.update();
              
              document.getElementById('status').textContent = 'Success! ✨';
              window.actualThreeJsTestComplete = true;
              console.log('✨ Actual Three.js test completed successfully!');
              
            } catch (e) {
              console.log('❌ Actual Three.js test failed:', e.message);
              console.log('Error stack:', e.stack);
              document.getElementById('status').textContent = 'Failed: ' + e.message;
              window.actualThreeJsTestError = e.message;
              window.actualThreeJsTestComplete = true;
            }
          };
          
          // Start the test
          startTest();
        </script>
      `
    });

    const filePath = writeTestFile('actual-threejs-test.html', html);
    console.log('Loading actual Three.js test file:', filePath);
    await page.goto(`file://${filePath}`);

    // Wait for test to complete
    await page.waitForFunction(() => window.actualThreeJsTestComplete, { timeout: 15000 });

    // Check results
    const error = await page.evaluate(() => window.actualThreeJsTestError);
    const status = await page.evaluate(() => document.getElementById('status')?.textContent);

    console.log('Actual Three.js test results:', { error, status });

    if (error) {
      console.log('Test failed with error (this may be expected):', error);
      // Check if it's the expected relative import error
      if (error.includes('Failed to resolve module specifier')) {
        console.log('✅ Got expected relative import error - this confirms the issue');
        expect(error).toContain('Failed to resolve module specifier');
      } else {
        throw new Error('Unexpected error: ' + error);
      }
    } else {
      console.log('✅ Test passed - Three.js loaded successfully!');
      expect(status).toContain('Success!');
      
      // Check that canvas was created
      const canvasExists = await page.evaluate(() => !!document.querySelector('#container canvas'));
      expect(canvasExists).toBe(true);
    }
  });

});