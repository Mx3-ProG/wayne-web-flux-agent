export const ASSISTANT_MENU_EVENT = "flux:menu-state";

export function publishAssistantMenuState(id: string, open: boolean) {
  window.dispatchEvent(new CustomEvent(ASSISTANT_MENU_EVENT, { detail: { id, open } }));
}
