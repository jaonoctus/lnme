<script lang="ts" setup>
import QrcodeVue from 'qrcode.vue'
import { useClipboard } from '@vueuse/core'

useHead({
  htmlAttrs: {
    class: 'dark'
  },
  bodyAttrs: {
    class: 'dark:bg-black'
  }
})

const router = useRouter()
const route = useRoute()

const hasParams = computed(() => route.query.ln && route.query.sats)

const lnAddress = ref<string>('')
const amount = ref(0)
const isValidated = ref(false)

const base64Image = ref<string|null>(null)
const callback = ref<string|null>(null)
const maxSendable = ref(0)
const minSendable = ref(0)

const invoice = ref<string|null>(null)
const expiresAt = ref(0)
const remainingTime = ref('')
const isExpired = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function startTimer() {
  stopTimer()
  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function updateTimer() {
  const now = Math.floor(Date.now() / 1000)
  const diff = expiresAt.value - now
  if (diff <= 0) {
    remainingTime.value = 'Expired'
    isExpired.value = true
    stopTimer()
  } else {
    remainingTime.value = formatRemaining(diff)
    isExpired.value = false
  }
}

onUnmounted(() => stopTimer())

// Form state
const formAddress = ref('')
const formAmount = ref<number|undefined>()
const formError = ref('')
const formLoading = ref(false)

watch(() => route.query, async (query) => {
  if (query.ln && typeof query.ln === 'string') {
    formAddress.value = query.ln
    if (query.sats && typeof query.sats === 'string') {
      formAmount.value = Number(query.sats)
      lnAddress.value = query.ln
      await validateAddress()
      amount.value = Number(query.sats)
      await getInvoice()
    }
  }
  if (query.sats && typeof query.sats === 'string') {
    formAmount.value = Number(query.sats)
  }
}, { immediate: true })

async function validateAddress() {
  amount.value = 0
  isValidated.value = false
  base64Image.value = null
  callback.value = null
  maxSendable.value = 0
  minSendable.value = 0
  invoice.value = null

  const res = await $fetch('/api/lnurlp', {
    method: 'POST',
    body: {
      lnAddress: lnAddress.value,
    },
  })

  if (res.base64Image) {
    base64Image.value = res.base64Image
  }
  if (res.callback) {
    callback.value = res.callback
    maxSendable.value = res.maxSendable
    minSendable.value = res.minSendable
    isValidated.value = true
  }
}

async function getInvoice() {
  invoice.value = null
  const res = await $fetch('/api/callback', {
    method: 'POST',
    body: {
      callback: callback.value,
      amount: amount.value,
    }
  })
  invoice.value = res.invoice
  expiresAt.value = res.expiresAt
  startTimer()
}

async function submitForm() {
  formError.value = ''

  const address = formAddress.value.trim()
  if (!address || !address.includes('@') || address.split('@').length !== 2) {
    formError.value = 'Please enter a valid Lightning address (e.g. user@domain.com)'
    return
  }

  const sats = Number(formAmount.value)
  if (!sats || sats <= 0) {
    formError.value = 'Please enter a valid amount in sats'
    return
  }

  formLoading.value = true
  try {
    await $fetch('/api/lnurlp', {
      method: 'POST',
      body: { lnAddress: address },
    })
    router.push({ path: '/', query: { ln: address, sats: String(sats) } })
  } catch {
    formError.value = 'Invalid Lightning address. Could not resolve LNURL.'
  } finally {
    formLoading.value = false
  }
}

const isCopied = ref(false)

function share () {
  const { copy: copyToClipboard, isSupported } = useClipboard()
  isCopied.value = false

  if (isSupported.value && invoice.value) {
    copyToClipboard(invoice.value)
    isCopied.value = true

    setTimeout(() => {
      isCopied.value = false
    }, 2_000)
  } else {
    alert('cannot copy on this device')
  }
}
</script>

<template>
  <!-- Invoice view -->
  <div v-if="invoice" class="flex min-h-full flex-col justify-center py-2 lg:py-12 sm:px-6 lg:px-8 text-white">
    <div class="sm:mx-auto sm:w-full">
      <h1 class="font-bold text-center text-2xl leading-loose">
        Send <Badge>{{ Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 }) }}</Badge> sats <br/> to <Badge>{{ lnAddress }}</Badge>
      </h1>
    </div>
    <div>
      <div class="flex justify-center mt-5" v-if="base64Image">
        <img :src="base64Image" style="height: 120px; width: 120px;" class="rounded-full" />
      </div>
    </div>
    <div class="mt-5 sm:mx-auto sm:w-full">
      <h3 class="text-center">
        Open the lightning wallet,<br/>scan the QR Code or paste in the invoice
      </h3>
    </div>
    <div class="flex justify-center mt-5">
      <div class="border-2 p-2 rounded-lg border-orange-500 bg-white">
        <qrcode-vue :value="invoice" :size="250" level="L"></qrcode-vue>
      </div>
    </div>
    <div class="mt-5 text-center text-sm" :class="isExpired ? 'text-red-400' : 'text-gray-400'">
      {{ isExpired ? 'Invoice expired' : `Expires in ${remainingTime}` }}
    </div>
    <div class="flex justify-center mt-5">
      <div>
        <button @click.prevent="share" type="button" class="rounded-md bg-orange-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">
          <span v-if="!isCopied">Copy invoice</span>
          <span v-else>copied</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Form view -->
  <div v-else-if="!hasParams" class="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 text-white">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h1 class="text-center text-3xl font-bold">Generate Invoice</h1>
      <p class="mt-2 text-center text-sm text-gray-400">
        Enter a Lightning address and amount to generate a payment invoice
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <form @submit.prevent="submitForm" class="space-y-6">
        <div>
          <label for="ln-address" class="block text-sm font-medium">Lightning Address</label>
          <input
            id="ln-address"
            v-model="formAddress"
            type="text"
            placeholder="user@domain.com"
            required
            class="mt-1 block w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm"
          />
        </div>

        <div>
          <label for="sats-amount" class="block text-sm font-medium">Amount (sats)</label>
          <input
            id="sats-amount"
            v-model.number="formAmount"
            type="number"
            min="1"
            placeholder="1000"
            required
            class="mt-1 block w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm"
          />
        </div>

        <div v-if="formError" class="rounded-md bg-red-900/50 p-3 text-sm text-red-400">
          {{ formError }}
        </div>

        <button
          type="submit"
          :disabled="formLoading"
          class="w-full rounded-md bg-orange-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="formLoading">Validating...</span>
          <span v-else>Generate Invoice</span>
        </button>
      </form>
    </div>
  </div>
</template>
