// @ts-check
// 图片压缩：选图 → 选格式/质量 → 压缩 → 查看结果/下载（模拟真实用户流程）
import { test, expect } from '@playwright/test';
import { getTestImageFile } from './fixtures.js';

test.describe('图片压缩与格式转换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/image/compress');
  });

  test('未添加图片时压缩按钮禁用', async ({ page }) => {
    const compressBtn = page.getByRole('button', { name: /Compress|压缩/ });
    await expect(compressBtn).toBeDisabled();
  });

  test('用户流程：添加图片 → 压缩 → 看到结果与下载', async ({ page }) => {
    test.setTimeout(25000);
    const file = getTestImageFile();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([file]);

    await expect(page.getByText('test.png')).toBeVisible();
    const compressBtn = page.getByRole('button', { name: /Compress|压缩/ });
    await expect(compressBtn).toBeEnabled();
    await compressBtn.click();

    await expect(page.getByText(/Processing|处理中/).or(page.getByText(/smaller|更小|Same size|相同大小/))).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Download All|全部下载/ })).toBeVisible({ timeout: 15000 });
  });

  test('可展开选项并选择输出格式', async ({ page }) => {
    test.setTimeout(25000);
    await page.locator('details').locator('summary').first().click();
    await expect(page.getByLabel(/Output format|输出格式/).or(page.locator('select#format'))).toBeVisible();
    await page.locator('select#format').selectOption('webp');
    const file = getTestImageFile();
    await page.locator('input[type="file"]').setInputFiles([file]);
    await page.getByRole('button', { name: /Compress|压缩/ }).click();
    await expect(page.getByText(/WEBP|WebP/)).toBeVisible({ timeout: 15000 });
  });

  test('清空后列表为空、压缩按钮再次禁用', async ({ page }) => {
    const file = getTestImageFile();
    await page.locator('input[type="file"]').setInputFiles([file]);
    await expect(page.getByText('test.png')).toBeVisible();
    await page.getByRole('button', { name: /Clear All|清空/ }).click();
    await expect(page.getByText('test.png')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Compress|压缩/ })).toBeDisabled();
  });
});
