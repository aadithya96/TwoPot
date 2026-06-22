import { fromStorageAmount } from './currency'

export interface UpiPayLinkInput {
  /** Payee's UPI VPA, e.g. "name@bank". */
  vpa: string
  /** Payee's display name, shown in the UPI app's confirmation screen. */
  payeeName: string
  /** Amount in paise. */
  amount: number
  /** Short transaction note, e.g. the settlement's month label. */
  note: string
}

/** Builds a `upi://pay` deep link that opens the user's UPI app with the amount pre-filled. */
export function buildUpiPayLink({ vpa, payeeName, amount, note }: UpiPayLinkInput): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: fromStorageAmount(amount).toFixed(2),
    cu: 'INR',
    tn: note,
  })
  return `upi://pay?${params.toString()}`
}
