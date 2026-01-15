import { test, expect } from '@playwright/test';

test('Clicking a country shows a distance ring', async ({ page }) => {
  await page.goto('/');

  // Wait for map
  await page.waitForSelector('#map');

  // Click France (rough screen location)
  await page.mouse.click(500, 300);

  // Slider should be visible
  await expect(page.locator('#distanceSlider')).toBeVisible();
  await expect(page.locator('#toleranceSlider')).toBeVisible();
  
  //TODO : If possible choose a specific country ... using turfjs & leafletjs.  E.g. Libya
  //TODO : Test if ring is shown. 
  //TODO : Test if distance slider redraws the circel
  //TODO : Test if tolerance slider change selects a different country. 
  //TODO : Choose a second country & check for color change.  E.g. Saudi Arabia
  //TODO : Test if second click shows a different hatch pattern.  E.g. Egypt. 
});
