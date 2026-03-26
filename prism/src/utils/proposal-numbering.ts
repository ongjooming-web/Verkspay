/**
 * Generate a sequential proposal number for a user
 * Format: PROP-0001, PROP-0002, ..., PROP-9999, PROP-10000, etc.
 */
export async function generateProposalNumber(
  userId: string,
  supabase: any
): Promise<string> {
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    try {
      // Get the user's highest proposal number
      const { data: lastProposal } = await supabase
        .from('proposals')
        .select('proposal_number')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNum = 1

      if (lastProposal?.proposal_number) {
        // Parse the number from "PROP-0005" -> 5
        const match = lastProposal.proposal_number.match(/PROP-(\d+)/)
        if (match) {
          nextNum = parseInt(match[1], 10) + 1
        }
      }

      // Pad to 4 digits, or 5+ if it exceeds 9999
      const padLength = nextNum > 9999 ? nextNum.toString().length : 4
      const paddedNum = nextNum.toString().padStart(padLength, '0')
      const proposalNumber = `PROP-${paddedNum}`

      console.log('[ProposalNumbering] Generated number:', { userId, proposalNumber, attempt: attempts + 1 })
      return proposalNumber
    } catch (error) {
      attempts++
      console.error('[ProposalNumbering] Attempt', attempts, '- Error:', error)

      if (attempts < maxAttempts) {
        // Small random delay to avoid thundering herd in race conditions
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))
      }
    }
  }

  throw new Error(`Failed to generate proposal number after ${maxAttempts} attempts`)
}
