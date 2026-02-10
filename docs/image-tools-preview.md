# 图片工具预览规范

所有生成/处理图片的工具页必须提供**预览功能**。

## 要求

1. **必须有预览入口**：每个生成结果旁提供「预览」按钮，或点击缩略图可打开预览。
2. **预览内容**：优先使用 `SliderComparePreview` 组件，展示原图与结果对比 + 滑块交互。
3. **数据结构**：向 `SliderComparePreview` 传入：
   - `item`: `{ name, previewUrl（原图 blob URL）, size（原图字节）, newSize（结果字节） }`
   - `resultBlobUrl`: 结果图片的 blob URL
   - `onClose`: 关闭回调

## 参考实现

| 工具 | 模式 | 说明 |
|------|------|------|
| `image/compress` | BatchResultsTable + SliderComparePreview | 批量处理，表格行内预览 |
| `image/playstore` | 单结果 + 预览按钮 + SliderComparePreview | 单一输出 |
| `image/appstore` | 单结果 + 预览按钮 + SliderComparePreview | 单一输出 |
| `image/favicon` | 多结果，每行预览按钮 + SliderComparePreview | 多尺寸输出 |

## 代码示例

### 单结果工具（如 playstore）

```svelte
<script>
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';

  let previewOpen = $state(false);
</script>

<button type="button" onclick={() => (previewOpen = true)}>{t('common.preview')}</button>

<SliderComparePreview
  open={previewOpen}
  item={result && sourceFile ? {
    name: result.name,
    previewUrl: sourcePreviewUrl,
    size: sourceFile.size,
    newSize: result.blob.size
  } : null}
  resultBlobUrl={result?.previewUrl ?? null}
  onClose={() => (previewOpen = false)}
/>
```

### 多结果工具（如 favicon）

```svelte
<script>
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';

  let previewItem = $state(null);
</script>

{#each results as item}
  <button onclick={() => openPreview(item)}>{t('common.preview')}</button>
{/each}

<SliderComparePreview
  open={!!previewItem}
  item={previewItem && sourceFile ? {
    name: previewItem.name,
    previewUrl: sourcePreviewUrl,
    size: sourceFile.size,
    newSize: previewItem.blob.size
  } : null}
  resultBlobUrl={previewItem?.previewUrl ?? null}
  onClose={() => (previewItem = null)}
/>
```

## 无障碍（a11y）

- 使用 `button` 包裹可点击的缩略图，避免在 `img` 上直接绑定 `onclick`
- 为预览按钮添加 `aria-label={t('common.preview')}`
