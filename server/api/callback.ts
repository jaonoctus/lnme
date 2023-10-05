export default defineEventHandler(async (event): Promise<{
  invoice: string
}> => {
  const body = await readBody(event)
  const { callback, amount } = body

  const res = await $fetch<any>(`${callback}?amount=${amount*1000}`)

  const invoice = `${res.pr}`

  return {
    invoice
  }
})
