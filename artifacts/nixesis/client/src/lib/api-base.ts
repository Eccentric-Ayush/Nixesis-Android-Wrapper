import { Capacitor } from "@capacitor/core";
import { NIXESIS_API_BASE_PATH } from "@shared/const";

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

export const isMissingNativeApiConfig =
  Capacitor.isNativePlatform() && !configuredApiBase;

export function getApiBaseUrl() {
  if (configuredApiBase) {
    return configuredApiBase.replace(/\/+$/, "");
  }

  return `${window.location.origin}${NIXESIS_API_BASE_PATH}`;
}