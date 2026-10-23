type Factor = {
  id: string;
  status: string;
  factor_type: string;
  friendly_name?: string;
};

// A lost enrollment response cannot be resumed: the provider does not return
// its secret again. Replace only unfinished factors belonging to this flow.
export async function clearPendingOwnerEnrollment(
  factors: Factor[],
  unenroll: (id: string) => Promise<{ error: unknown }>,
) {
  for (const factor of factors) {
    if (
      factor.factor_type === "totp" &&
      factor.status === "unverified" &&
      factor.friendly_name === "Memocious owner"
    ) {
      const result = await unenroll(factor.id);
      if (result.error) throw result.error;
    }
  }
}
