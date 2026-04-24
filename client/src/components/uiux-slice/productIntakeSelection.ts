interface DraftRef {
  id: string;
}

export function resolveSelectedDraft<T extends DraftRef>(
  drafts: T[],
  selectedDraftId?: string | null
): T | null {
  if (!selectedDraftId) {
    return null;
  }

  return drafts.find(draft => draft.id === selectedDraftId) ?? null;
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
