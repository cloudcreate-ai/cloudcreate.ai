// @ts-check
// 图片缩放：选图 → 选模式/参数 → 缩放 → 看到结果
import { test, expect } from '@playwright/test';
import { getTestImageFile } from './fixtures.js';

test.describe('图片缩放', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/image/resize');
  });

  test('未添加图片时缩放按钮禁用', async ({ page }) => {
    const resizeBtn = page.getByRole('button', { name: /Resize|缩放/ });
    await expect(resizeBtn).toBeDisabled();
  });

  test('用户流程：添加图片 → 选择按比例 → 缩放 → 看到结果', async ({ page }) => {
    const file = getTestImageFile();
    await page.locator('input[type="file"]').setInputFiles([file]);
    await expect(page.getByText('test.png')).toBeVisible();

    await page.getByRole('button', { name: /Resize|缩放/ }).click();
    await expect(page.getByRole('button', { name: /Download All|全部下载/ })).toBeVisible({ timeout: 15000 });
  });
});
