/**
 * Decides whether opening a case should go straight to the edit page (CR-036).
 *
 * The owner goes directly to "rediger" because opening a case is usually done
 * to fill it in. Anyone else (including an admin looking at someone else's
 * case) keeps the read-only page. The read-only page stays reachable for the
 * owner with `?visning=1`, which "Tilbake", "Avbryt" and saving link to.
 */
export function shouldOpenInEditMode(opts: {
  ownerEmail: string;
  userEmail: string | undefined;
  /** Value of the `visning` query parameter, if any. */
  viewParam: string | string[] | undefined;
}): boolean {
  if (!opts.userEmail) return false;
  const viewRequested = Array.isArray(opts.viewParam) ? opts.viewParam.length > 0 : !!opts.viewParam;
  if (viewRequested) return false;
  return opts.ownerEmail === opts.userEmail;
}

/** The read-only case page for an owner who wants to see it rather than edit it. */
export function viewHref(caseId: string): string {
  return `/case/${caseId}?visning=1`;
}
