import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

// Minimal valid PNG: 1x1 red pixel
const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

function createTestPng(filepath: string) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true })
  fs.writeFileSync(filepath, Buffer.from(TEST_PNG_BASE64, 'base64'))
}

test('image upload via file picker displays image with blob URL', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)

  // Open a note
  await page.locator('[data-testid="type-icon"]').first().click({ timeout: 10000 })
  await page.waitForTimeout(500)

  const editor = page.locator('.bn-editor')
  await expect(editor).toBeVisible({ timeout: 10000 })
  await editor.click()
  await page.waitForTimeout(200)

  // Insert image block via slash command
  await page.keyboard.press('Enter')
  await page.waitForTimeout(100)
  await page.keyboard.type('/image', { delay: 80 })
  await page.waitForTimeout(500)

  // Select Image from slash menu (press Enter to pick first match)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)

  // Verify Upload tab is available (uploadFile is configured)
  const fileInput = page.locator('input[type="file"]')
  expect(await fileInput.count()).toBeGreaterThan(0)

  // Upload a test image
  const testImagePath = path.join(process.cwd(), 'test-results', 'test-image.png')
  createTestPng(testImagePath)

  await fileInput.first().setInputFiles(testImagePath)
  await page.waitForTimeout(2000)

  // Verify: image element exists in the editor
  const images = page.locator('.bn-editor img')
  const imageCount = await images.count()
  expect(imageCount).toBeGreaterThan(0)

  // Verify: image uses blob URL (not stuck on empty or data URL)
  const src = await images.first().getAttribute('src')
  expect(src).toMatch(/^blob:/)

  // Verify: no "Loading..." elements remain
  const loadingEls = page.locator('.bn-file-loading-preview')
  expect(await loadingEls.count()).toBe(0)

  await page.screenshot({ path: 'test-results/image-upload-after.png', fullPage: true })

  if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath)
})

test('editor has uploadFile configured (no error on image block insert)', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)

  // Click first note
  await page.locator('[data-testid="type-icon"]').first().click({ timeout: 10000 })
  await page.waitForTimeout(500)

  const editor = page.locator('.bn-editor')
  await expect(editor).toBeVisible({ timeout: 10000 })

  // Capture console errors
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  // Insert an image block via slash command
  await editor.click()
  await page.keyboard.press('Enter')
  await page.keyboard.type('/image', { delay: 30 })
  await page.waitForTimeout(500)

  // Press Enter to select Image
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)

  await page.screenshot({ path: 'test-results/image-block-inserted.png', fullPage: true })

  // No errors related to upload should have occurred
  const uploadErrors = errors.filter(e => e.includes('upload'))
  expect(uploadErrors).toHaveLength(0)
})
