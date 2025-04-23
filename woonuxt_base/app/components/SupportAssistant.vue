<template>
  <div class="fixed bottom-6 right-10 md:right-16 z-50">
    <button @click="open = !open" class="messenger-fab">
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="url(#green_grad)"/>
    <path d="M18 5l-7 11h6l-2 8 8-11h-6l1-8z" fill="#fff"/>
    <defs>
      <linearGradient id="green_grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stop-color="#7ed957"/>
        <stop offset="1" stop-color="#1db954"/>
      </linearGradient>
    </defs>
  </svg>
</button>
    <div v-if="open" class="w-80 bg-white rounded-lg shadow-lg mt-2 p-4 flex flex-col">
      <div class="flex-1 overflow-y-auto max-h-80 mb-2">
        <div v-for="msg in messages" :key="msg.id" :class="msg.role">
          <div v-if="msg.role === 'assistant'" class="flex items-start gap-2 my-1">
            <span class="flex-shrink-0 messenger-avatar">M</span>
            <div>
              <span class="font-semibold text-green-700 text-xs">Marc</span><br />
              <span class="assistant-bubble">{{ msg.content }}</span>
            </div>
          </div>
          <div v-else class="my-1 text-right">
            <span class="inline-block px-2 py-1 rounded bg-green-100">{{ msg.content }}</span>
          </div>
        </div>
        <div v-if="typing" class="flex items-start gap-2 my-1 animate-pulse">
          <span class="flex-shrink-0 bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold">M</span>
          <div class="flex flex-col">
            <span class="font-semibold text-green-700 text-xs">Marc</span><br />
            <span class="inline-block px-2 py-1 rounded bg-gray-100">
              <span class="dot-animation">
                <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
              </span>
            </span>
          </div>
        </div>
      </div>
      <form @submit.prevent="send" class="flex gap-2">
        <input v-model="input" class="flex-1 border rounded p-2" placeholder="Posez votre question ici..." />
        <button class="bg-green-600 text-white rounded px-4" :disabled="loading">Envoyer</button>
      </form>
      <button @click="showSupportForm = true" class="mt-2 text-xs underline text-green-700 hover:text-green-900">Contacter l'assistance</button>
      <div v-if="showSupportForm" class="mt-2 bg-gray-50 p-3 rounded shadow">
        <form @submit.prevent="contactSupport" class="flex flex-col gap-2">
          <input v-model="supportEmail" type="email" class="border rounded p-2" placeholder="Votre email" required />
          <textarea v-model="supportMessage" class="border rounded p-2" placeholder="Votre message" required rows="3"></textarea>
          <div class="flex gap-2">
            <button class="bg-green-600 text-white rounded px-4" :disabled="supportLoading">Envoyer à l'assistance</button>
            <button type="button" @click="showSupportForm = false" class="text-xs underline">Annuler</button>
          </div>
          <div v-if="supportSuccess" class="text-green-700 text-xs">Message envoyé à l'assistance !</div>
          <div v-if="supportError" class="text-red-600 text-xs">{{ supportError }}</div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Animation CSS pour les trois points
onMounted(() => {
  const style = document.createElement('style')
  style.innerHTML = `
  .messenger-fab {
    background: linear-gradient(135deg, #7ed957 0%, #1db954 100%);
    border-radius: 50%;
    box-shadow: 0 4px 16px rgba(30,215,96,0.18);
    border: none;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s cubic-bezier(.4,2,.6,1), box-shadow 0.18s;
    cursor: pointer;
    position: relative;
  }
  .messenger-fab:hover {
    transform: scale(1.08);
    box-shadow: 0 8px 32px rgba(30,215,96,0.28);
  }
  .messenger-avatar {
    background: linear-gradient(90deg, #7ed957 0%, #1db954 100%);
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: bold;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(30,215,96,0.10);
  }
  .assistant-bubble {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 1.25rem 1.25rem 1.25rem 0.25rem;
    background: linear-gradient(90deg, #7ed957 0%, #1db954 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(30, 215, 96, 0.12);
    margin-top: 2px;
    margin-bottom: 2px;
  }
  .dot-animation .dot {
    animation: blink 1.4s infinite both;
    font-size: 1.5em;
    opacity: 0.4;
  }
  .dot-animation .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot-animation .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink {
    0%, 80%, 100% { opacity: 0.4; }
    40% { opacity: 1; }
  }`
  document.head.appendChild(style)
})

const open = ref(false)
const input = ref('')
const loading = ref(false)
const typing = ref(false)
const messages = ref<{id:number,role:'user'|'assistant',content:string}[]>([])

// Pour le formulaire de contact assistance
const showSupportForm = ref(false)
const supportEmail = ref('')
const supportMessage = ref('')
const supportLoading = ref(false)
const supportSuccess = ref(false)
const supportError = ref('')

async function contactSupport() {
  supportLoading.value = true
  supportSuccess.value = false
  supportError.value = ''
  try {
    const res = await fetch('/api/support-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: supportEmail.value, message: supportMessage.value })
    })
    const data = await res.json()
    if (data.success) {
      supportSuccess.value = true
      supportEmail.value = ''
      supportMessage.value = ''
      showSupportForm.value = false
      // Ajout d'un message de confirmation dans le chatbox
      messages.value.push({
        id: Date.now(),
        role: 'assistant',
        content: "Merci, votre message a bien été transmis à notre équipe. Vous serez recontacté sous 24/48h par un membre de l'équipe d'assistance."
      })
    } else {
      supportError.value = data.error || 'Erreur lors de l\'envoi.'
    }
  } catch (e) {
    supportError.value = 'Erreur lors de l\'envoi.'
  } finally {
    supportLoading.value = false
  }
}


onMounted(() => {
  // Message de bienvenue de Marc
  messages.value.push({
    id: Date.now(),
    role: 'assistant',
    content: "Bonjour, comment puis-je vous aider aujourd'hui ?"
  })
})

async function send() {
  if (!input.value.trim()) return
  messages.value.push({ id: Date.now(), role: 'user', content: input.value })
  input.value = ''
  loading.value = true
  typing.value = true
  // Délai d'attente réaliste (2 à 4 secondes)
  const delay = Math.floor(Math.random() * 2000) + 2000
  await new Promise(resolve => setTimeout(resolve, delay))
  const res = await fetch('/api/ai-support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: messages.value[messages.value.length-1]?.content ?? '' })
  })
  const { answer } = await res.json()
  messages.value.push({ id: Date.now()+1, role: 'assistant', content: answer })
  loading.value = false
  typing.value = false
}
</script>
