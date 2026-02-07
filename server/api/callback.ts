import { decode } from 'light-bolt11-decoder'

export default defineEventHandler(async (event): Promise<{
  invoice: string
  expiresAt: number
}> => {
  const body = await readBody(event)
  const { callback, amount } = body

  const res = await $fetch<any>(`${callback}?amount=${amount*1000}`)

  const invoice = `${res.pr}`

  const decoded = decode(invoice)
  const timestamp = decoded.sections.find((s: any) => s.name === 'timestamp')?.value as number
  const expiry = decoded.sections.find((s: any) => s.name === 'expiry')?.value as number | undefined
  const expiresAt = timestamp + (expiry ?? 3600)

  return {
    invoice,
    expiresAt
  }
})
