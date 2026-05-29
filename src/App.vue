<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from './composables/useSupabase'

const router = useRouter()
const { supabase } = useSupabase()

onMounted(() => {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session && router.currentRoute.value.meta.requiresAuth) {
      router.push('/login')
    }
  })
})
</script>

<template>
  <router-view />
</template>
