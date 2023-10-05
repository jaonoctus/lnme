<script setup>
import QrcodeVue from 'qrcode.vue'

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

async function share() {
  // TODO
}
</script>

<template>
  <div>
    <div>
      lightning address:
      <input v-model="lnAddress" type="email" />
    </div>
    <button @click="validateAddress">validate</button>
  </div>
  <div v-if="isValidated">
    <div v-if="base64Image">
      <img :src="base64Image" style="height: 160px; width: 160px;" />
    </div>
    <div>
      amount (Sats):
      <input
        v-model="amount"
        type="number"
        step="1"
        :min="minSendable"
        :max="maxSendable"
      />
    </div>
    <div>
      <button @click="getInvoice">get invoice</button>
      <!-- <button @click="share">share</button> -->
    </div>
    <div v-if="invoice">
      <qrcode-vue :value="invoice" size="300"></qrcode-vue>
    </div>
  </div>
</template>
