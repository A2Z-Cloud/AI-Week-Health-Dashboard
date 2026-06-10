<template>
  <span :class="['chip', chip_class]">
    <span class="chip__dot" aria-hidden="true"></span>
    {{ display_text }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'review',
    validator: (val) => ['ok', 'warning', 'bad', 'review'].includes(val),
  },
})

const text_map = {
  ok: 'OK',
  warning: 'Attention',
  bad: 'Issue',
  review: 'Needs review',
}

const display_text = computed(() => text_map[props.status] ?? text_map.review)

const chip_class = computed(() => `chip--${props.status}`)
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  white-space: nowrap;
  line-height: 1.6;
}

.chip__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ok */
.chip--ok {
  background-color: #e6f4ea;
  color: #1e7e34;
}
.chip--ok .chip__dot {
  background-color: #1e7e34;
}

/* warning */
.chip--warning {
  background-color: #fff4e5;
  color: #b26a00;
}
.chip--warning .chip__dot {
  background-color: #b26a00;
}

/* bad */
.chip--bad {
  background-color: #fdecea;
  color: #c5221f;
}
.chip--bad .chip__dot {
  background-color: #c5221f;
}

/* review */
.chip--review {
  background-color: #eef1f5;
  color: #5f6b7a;
}
.chip--review .chip__dot {
  background-color: #5f6b7a;
}
</style>
