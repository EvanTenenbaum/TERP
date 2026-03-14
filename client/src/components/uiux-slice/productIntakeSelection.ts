interface DraftRef {
  id: string;
}

export function resolveNextSelectedDraftId(params: {
  drafts: DraftRef[];
  requestedDraftId?: string | null;
  currentSelectedDraftId?: string | null;
}): string | null {
  const { drafts, requestedDraftId, currentSelectedDraftId } = params;

  if (requestedDraftId !== undefined) {
    return drafts.some(draft => draft.id === requestedDraftId)
      ? requestedDraftId
      : null;
  }

  if (!currentSelectedDraftId) {
    return null;
  }

  return drafts.some(draft => draft.id === currentSelectedDraftId)
    ? currentSelectedDraftId
    : null;
}
