<template>
  <div class="fixed bottom-6 right-6 z-50">
    <button @click="open = !open" class="bg-green-600 text-white rounded-full p-4 shadow-lg">💬</button>
    <div v-if="open" class="w-80 bg-white rounded-lg shadow-lg mt-2 p-4 flex flex-col">
      <div class="flex-1 overflow-y-auto max-h-80 mb-2">
        <div v-for="msg in messages" :key="msg.id" :class="msg.role">
          <div v-if="msg.role === 'assistant'" class="flex items-start gap-2 my-1">
            <span class="flex-shrink-0 bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold">M</span>
            <div>
              <span class="font-semibold text-green-700 text-xs">Marc</span><br />
              <span class="inline-block px-2 py-1 rounded bg-gray-100">{{ msg.content }}</span>
            </div>
          </div>
          <div v-else class="my-1 text-right">
            <span class="inline-block px-2 py-1 rounded bg-green-100">{{ msg.content }}</span>
          </div>
        </div>
      </div>
      <form @submit.prevent="send" class="flex gap-2">
        <input v-model="input" class="flex-1 border rounded p-2" placeholder="Posez votre question à Marc..." />
        <button class="bg-green-600 text-white rounded px-4" :disabled="loading">Envoyer</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const open = ref(false)
const input = ref('')
const loading = ref(false)
const messages = ref<{id:number,role:'user'|'assistant',content:string}[]>([])

onMounted(() => {
  // Message de bienvenue de Marc
  messages.value.push({
    id: Date.now(),
    role: 'assistant',
    content: "Bonjour, je suis Marc, votre assistant IA. Je suis là pour vous aider avec vos commandes et questions de livraison. Comment puis-je vous aider aujourd'hui ?"
  })
})

async function send() {
  if (!input.value.trim()) return
  messages.value.push({ id: Date.now(), role: 'user', content: input.value })
  loading.value = true
  const res = await fetch('/api/ai-support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: input.value })
  })
  const { answer } = await res.json()
  messages.value.push({ id: Date.now()+1, role: 'assistant', content: answer })
  input.value = ''
  loading.value = false
}
</script>
