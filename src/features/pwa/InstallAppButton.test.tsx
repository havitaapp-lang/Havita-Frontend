/**
 * «Instalar aplicación»: solo móviles y tablets, nunca en escritorio ni dentro de la app instalada.
 * Android usa el aviso nativo; iOS/iPadOS muestra los pasos (Apple no permite instalar desde un botón).
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InstallAppButton } from './InstallAppButton';
import { detectInstallBrowser, detectInstallPlatform, installPromptStore, isRunningStandalone } from './installPlatform';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipados: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  androidPhone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0',
  androidWebView: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36',
};

function setDevice(ua: string, touch: number, standalone = false) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touch, configurable: true });
  window.matchMedia = vi.fn((q: string) => ({
    matches: standalone && q === '(display-mode: standalone)',
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as any;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  installPromptStore._reset();
});

describe('detectInstallPlatform', () => {
  it.each([
    ['iphone', 5, 'ios'],
    ['ipados', 5, 'ios'],
    ['androidPhone', 5, 'android'],
    ['androidTablet', 10, 'android'],
    ['windows', 0, 'desktop'],
    ['windows', 10, 'desktop'], // portátil táctil
    ['mac', 0, 'desktop'],
  ] as const)('%s (touch %i) → %s', (k, touch, expected) => {
    expect(detectInstallPlatform(UA[k], touch)).toBe(expected);
  });
});

describe('detectInstallBrowser', () => {
  it.each([
    ['iphone', 'ios', 'safari'],
    ['iphoneChrome', 'ios', 'other'],
    ['iphoneInstagram', 'ios', 'in-app'],
    ['androidPhone', 'android', 'chrome'],
    ['androidWebView', 'android', 'in-app'],
  ] as const)('%s → %s', (k, platform, expected) => {
    expect(detectInstallBrowser(UA[k], platform)).toBe(expected);
  });
});

describe('isRunningStandalone', () => {
  it('detecta la app instalada (display-mode y navigator.standalone de iOS)', () => {
    setDevice(UA.iphone, 5, true);
    expect(isRunningStandalone()).toBe(true);
    setDevice(UA.iphone, 5, false);
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    expect(isRunningStandalone()).toBe(true);
    Object.defineProperty(navigator, 'standalone', { value: undefined, configurable: true });
    expect(isRunningStandalone()).toBe(false);
  });
});

describe('InstallAppButton', () => {
  it('no aparece en escritorio', () => {
    setDevice(UA.windows, 0);
    render(<InstallAppButton />);
    expect(screen.queryByTestId('install-app-button')).toBeNull();
  });

  it('no aparece dentro de la app instalada', () => {
    setDevice(UA.iphone, 5, true);
    render(<InstallAppButton />);
    expect(screen.queryByTestId('install-app-button')).toBeNull();
  });

  it('iPhone: muestra los pasos de Compartir → Agregar a inicio', () => {
    setDevice(UA.iphone, 5);
    render(<InstallAppButton />);
    fireEvent.click(screen.getByTestId('install-app-button'));
    expect(screen.getByTestId('install-steps-ios')).toBeTruthy();
  });

  it('iPad (se identifica como Mac): también aparece', () => {
    setDevice(UA.ipados, 5);
    render(<InstallAppButton />);
    expect(screen.getByTestId('install-app-button')).toBeTruthy();
  });

  it('Android con aviso nativo: lo abre y desaparece al aceptar', async () => {
    setDevice(UA.androidPhone, 5);
    const prompt = vi.fn().mockResolvedValue(undefined);
    installPromptStore._reset({
      deferredPrompt: { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) } as any,
    });
    render(<InstallAppButton />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('install-app-button'));
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('install-app-button')).toBeNull();
    expect(screen.queryByTestId('install-steps-android')).toBeNull();
  });

  it('Android sin aviso nativo (otro navegador): muestra los pasos del menú', () => {
    setDevice(UA.androidTablet, 10);
    render(<InstallAppButton />);
    fireEvent.click(screen.getByTestId('install-app-button'));
    expect(screen.getByTestId('install-steps-android')).toBeTruthy();
  });

  it('iPhone en Safari: flecha animada hacia la barra de abajo', () => {
    setDevice(UA.iphone, 5);
    render(<InstallAppButton />);
    fireEvent.click(screen.getByTestId('install-app-button'));
    expect(screen.getByTestId('share-arrow-bottom')).toBeTruthy();
  });

  it('iPad en Safari: flecha hacia arriba a la derecha', () => {
    setDevice(UA.ipados, 5);
    render(<InstallAppButton />);
    fireEvent.click(screen.getByTestId('install-app-button'));
    expect(screen.getByTestId('share-arrow-top')).toBeTruthy();
  });

  it('Chrome en iPhone: pasos adaptados, recomienda Safari y sin flecha', () => {
    setDevice(UA.iphoneChrome, 5);
    render(<InstallAppButton />);
    fireEvent.click(screen.getByTestId('install-app-button'));
    expect(screen.getByTestId('install-steps-ios-other')).toBeTruthy();
    expect(screen.getByTestId('install-recommend-safari')).toBeTruthy();
    expect(screen.queryByTestId('share-arrow-bottom')).toBeNull();
  });

  it.each([
    ['WhatsApp/Instagram en iPhone', 'iphoneInstagram', 'Safari'],
    ['WebView en Android', 'androidWebView', 'Chrome'],
  ] as const)('%s: pide abrir en %s y permite copiar el enlace', (_n, k, browser) => {
    setDevice(UA[k], 5);
    const prompt = vi.fn();
    installPromptStore._reset({ deferredPrompt: { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) } as any });
    render(<InstallAppButton />);
    fireEvent.click(screen.getByTestId('install-app-button'));
    expect(prompt).not.toHaveBeenCalled();
    expect(screen.getByTestId('install-steps-in-app').textContent).toContain(`Abrir en ${browser}`);
    expect(screen.getByTestId('install-copy-link')).toBeTruthy();
  });

  it('beforeinstallprompt real se captura y se evita el mini-banner del navegador', () => {
    const ev = new Event('beforeinstallprompt', { cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(installPromptStore.get().deferredPrompt).toBe(ev);
  });
});
