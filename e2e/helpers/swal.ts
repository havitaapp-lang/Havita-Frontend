import { expect, type Page, type Locator } from '@playwright/test';

/**
 * SweetAlert2 helpers. Swal renders confirmations as role="dialog" and toasts as a
 * non-modal popup; both are located by role/text so the tests do not depend on Swal CSS classes.
 */
export function swalDialog(page: Page, title: string | RegExp): Locator {
  return page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: title }) });
}

export async function confirmSwal(page: Page, title: string | RegExp, confirmLabel: string): Promise<void> {
  const dialog = swalDialog(page, title);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: confirmLabel, exact: true }).click();
  await expect(dialog).toBeHidden();
}

export async function cancelSwal(page: Page, title: string | RegExp, cancelLabel = 'Cancelar'): Promise<void> {
  const dialog = swalDialog(page, title);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: cancelLabel, exact: true }).click();
  await expect(dialog).toBeHidden();
}

export function toast(page: Page, text: string | RegExp): Locator {
  return page.getByText(text, { exact: typeof text === 'string' }).first();
}
