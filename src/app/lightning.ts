import {nwc} from "@getalby/sdk"
import {session} from "@welshman/app"

export const getWebLn = () => (window as any).webln

export const getNwcClient = () => {
  const $session = session.get()

  if (!$session?.wallet || $session.wallet.type !== "nwc") {
    throw new Error("No NWC wallet is connected")
  }

  const {info} = $session.wallet

  if (info.nostrWalletConnectUrl) {
    return new nwc.NWCClient({nostrWalletConnectUrl: info.nostrWalletConnectUrl})
  }

  return new nwc.NWCClient(info)
}

export const payInvoice = async (invoice: string, msats?: number) => {
  const $session = session.get()

  if (!$session?.wallet) {
    throw new Error("No wallet is connected")
  }

  if ($session.wallet.type === "nwc") {
    const params: {invoice: string; amount?: number} = {invoice}
    if (msats) params.amount = msats
    return getNwcClient().payInvoice(params)
  } else if ($session.wallet.type === "webln") {
    if (msats) throw new Error("Unable to pay zero invoices with webln")
    return getWebLn()
      .enable()
      .then(() => getWebLn().sendPayment(invoice))
  }
}

export type CreateInvoiceParams = {
  sats: number
  description?: string
}

export const createInvoice = async ({
  sats,
  description = "Receive via lightning",
}: CreateInvoiceParams) => {
  const $session = session.get()

  if (!$session?.wallet) {
    throw new Error("No wallet is connected")
  }

  const satAmount = Math.floor(sats)

  if (!Number.isFinite(satAmount) || satAmount <= 0) {
    throw new Error("Invalid satoshi amount")
  }

  if ($session.wallet.type === "nwc") {
    const createdInvoice = await getNwcClient().makeInvoice({
      amount: satAmount * 1000,
      description,
    })

    if (!createdInvoice.invoice) {
      throw new Error("NWC wallet failed to return an invoice")
    }

    return createdInvoice.invoice
  }

  if ($session.wallet.type === "webln") {
    const webLn = getWebLn()

    if (!webLn) {
      throw new Error("WebLN not available")
    }

    await webLn.enable()

    const response = await webLn.makeInvoice({
      amount: satAmount,
      defaultMemo: description,
    })

    const paymentRequest =
      typeof response === "string" ? response : response?.paymentRequest || response?.pr || ""

    if (!paymentRequest) {
      throw new Error("Invalid payment request returned from WebLN")
    }

    return paymentRequest
  }

  throw new Error("Unsupported wallet type")
}
