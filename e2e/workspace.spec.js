// @ts-check
// 工作区首页：标题、工具卡片、语言切换、导航
import { test, expect } from '@playwright/test';

test.describe('工作区首页', () => {
  test('打开首页显示标题与副标题', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'CloudCreate.ai' })).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText('Creative toolkit for the AI era').or(page.getByText('AI时代的创意工具集')),
    ).toBeVisible();
  });

  test('显示三个工具卡片并可点击进入', async ({ page }) => {
    await page.goto('/');
    const compressTitle = page.getByText(/Image Compress|图片压缩/);
    await expect(compressTitle).toBeVisible();
    await compressTitle.click();
    await expect(page).toHaveURL(/\/image\/compress/);
  });

  test('切换到中文后文案为中文', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '中文' }).click();
    await expect(page.getByText('AI时代的创意工具集')).toBeVisible();
    await expect(page.getByText('图片压缩')).toBeVisible();
  });

  test('从子页通过「工作区」返回首页', async ({ page }) => {
    await page.goto('/image/compress');
    await page.getByRole('link', { name: /Workspace|工作区/ }).click();
    await expect(page).toHaveURL('/');
  });
});
