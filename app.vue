<script setup>
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

const { query } = useRoute()

const lnAddress = ref('')
const amount = ref('')
const isValidated = ref(false)

const base64Image = ref(null)
const callback = ref(null)
const maxSendable = ref(0)
const minSendable = ref(0)

const invoice = ref(null)

onMounted(async () => {
  if (query.ln) {
    lnAddress.value = query.ln
    await validateAddress()
  }
  if (query.sats) {
    amount.value = query.sats
    await getInvoice()
  }
})

async function validateAddress() {
  amount.value = ''
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
}

const isCopied = ref(false)

function share () {
  const { copy: copyToClipboard, isSupported } = useClipboard()
  isCopied.value = false

  if (isSupported.value) {
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
      <div class="border-2 p-2 rounded-lg border-orange-500">
        <qrcode-vue :value="invoice" size="250"></qrcode-vue>
      </div>
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
</template>
