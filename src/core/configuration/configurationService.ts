import { Capacitor } from "@capacitor/core";
import { Configuration } from "./configurationService.types";
// eslint-disable-next-line no-undef

const environment = process.env.ENVIRONMENT || "local";
const keriaIP = process.env.KERIA_IP;

class ConfigurationService {
  private static configurationEnv: Configuration;

  static readonly INVALID_ENVIRONMENT_FILE = "Configuration file is invalid: ";
  static readonly CANNOT_LOAD_ENVIRONMENT_FILE =
    "Can not load environment file";

  async start() {
    await new Promise((rs, rj) => {
      import(`../../../configs/${environment}.yaml`)
        .then((module) => {
          const data = module.default;

          const validyCheck = this.configurationValid(data);
          if (validyCheck.success) {
            ConfigurationService.configurationEnv = data as Configuration;
            this.setKeriaIp();
          } else {
            rj(
              new Error(
                ConfigurationService.INVALID_ENVIRONMENT_FILE +
                  validyCheck.reason
              )
            );
          }

          rs(true);
        })
        .catch((e) => {
          rj(
            new Error(ConfigurationService.CANNOT_LOAD_ENVIRONMENT_FILE, {
              cause: e,
            })
          );
        });
    });
  }

  static get env() {
    return this.configurationEnv;
  }

  private setKeriaIp() {
    // Get Keria host: use KERIA_IP env var if set, otherwise auto-detect Android emulator
    // For tests: Set KERIA_IP environment variable explicitly
    let keriaHost: string | undefined;
    if (keriaIP) {
      keriaHost = keriaIP;
    } else {
      // Automatically use 10.0.2.2 for Android emulator at app runtime
      // 10.0.2.2 is the special alias Android emulator uses to reach the host machine
      try {
        if (Capacitor.getPlatform() === "android") {
          keriaHost = "10.0.2.2";
        }
      } catch {
        // If Capacitor is not available (e.g., in tests), fall back to undefined
      }
    }

    if (!keriaHost) {
      // No host override needed
      return;
    }

    const keriaUrl = ConfigurationService.configurationEnv.keri?.keria?.url;
    const keriaBootUrl =
      ConfigurationService.configurationEnv.keri?.keria?.bootUrl;
    if (keriaUrl && ConfigurationService.configurationEnv.keri?.keria) {
      ConfigurationService.configurationEnv.keri.keria.url = keriaUrl.replace(
        /\/\/[^:]+/,
        `//${keriaHost}`
      );
    }
    if (keriaBootUrl && ConfigurationService.configurationEnv.keri?.keria) {
      ConfigurationService.configurationEnv.keri.keria.bootUrl =
        keriaBootUrl.replace(/\/\/[^:]+/, `//${keriaHost}`);
    }
  }

  private configurationValid(
    data: Configuration
  ): { success: true } | { success: false; reason: string } {
    const keri = data.keri;
    if (typeof keri !== "object") {
      return this.invalid("Missing top-level KERI object");
    }

    const security = data.security;
    if (typeof security !== "object" || security === null) {
      return this.invalid("Missing top-level security object");
    }

    const rasp = security.rasp;
    if (typeof rasp !== "object" || rasp === null) {
      return this.invalid("Missing rasp object in security configuration");
    }

    if (typeof rasp.enabled !== "boolean") {
      return this.invalid("rasp.enabled must be a boolean value");
    }

    return { success: true };
  }

  private invalid(reason: string) {
    return { success: false, reason };
  }
}

export { ConfigurationService };
