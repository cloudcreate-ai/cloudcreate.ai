<script>
  import '../app.css';
  import { locale } from '$lib/i18n.js';
</script>

<div class="app-wrap">
  {#key $locale}
    <slot />
  {/key}
</div>
