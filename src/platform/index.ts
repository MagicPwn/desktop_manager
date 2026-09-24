import type { PlatformAdapter } from "./adapter";
import { BrowserAdapter } from "./browserAdapter";
import { TauriAdapter } from "./tauriAdapter";

export function createPlatformAdapter(): PlatformAdapter {
  return "__TAURI_INTERNALS__" in window ? new TauriAdapter() : new BrowserAdapter();
}
