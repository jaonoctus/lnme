export default defineEventHandler(async (event): Promise<{
  callback: string,
  base64Image: string | null,
  maxSendable: number,
  minSendable: number
}> => {
  const body = await readBody(event)

  const [username, domain] = body.lnAddress.split('@')

  const endpoint = `https://${domain}/.well-known/lnurlp/${username}`

  const res = await $fetch<any>(endpoint)

  if (!res.callback || res.tag !== 'payRequest') {
    // TODO
  }

  let base64Image = null

  if (res.metadata) {
    // metadata is a string of array of arrays
    // like '[["text/plain","text"],["text/html","html"]]'
    const metadata = JSON.parse(res.metadata)
    const image = metadata.find(([key]: any) => key === 'image/png;base64')
    if (image && image[1]) {
      base64Image = `data:image/png;base64,${image[1]}`
    }
  }

  let maxSendable = 0
  let minSendable = 0

  if (res.maxSendable) {
    maxSendable = res.maxSendable / 1000
  }

  if (res.minSendable) {
    minSendable = res.minSendable / 1000
  }

  return {
    callback: `${res.callback}`,
    base64Image,
    maxSendable,
    minSendable
  }
})
