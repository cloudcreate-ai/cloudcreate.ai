// @ts-check
// 图片裁剪：选图 → 出现裁剪区 → 可操作裁剪
import { test, expect } from '@playwright/test';
import { getTestImageFile } from './fixtures.js';

test.describe('图片裁剪', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/image/crop');
  });

  test('未添加图片时裁剪按钮禁用', async ({ page }) => {
    const cropBtn = page.getByRole('button', { name: /Select crop region|选择裁剪区域/ });
    await expect(cropBtn).toBeDisabled();
  });

  test('用户流程：添加图片后出现裁剪区域', async ({ page }) => {
    const file = getTestImageFile();
    await page.locator('input[type="file"]').setInputFiles([file]);
    await expect(page.getByText('test.png').or(page.locator('img[src^="blob:"]'))).toBeVisible({ timeout: 5000 });
    const cropBtn = page.getByRole('button', { name: /Select crop region|选择裁剪区域/ });
    await expect(cropBtn).toBeEnabled();
  });
});
