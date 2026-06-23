import type {CapacitorConfig} from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "social.flotilla",
  appName: "Flotilla",
  webDir: "build",
  ios: {
    scheme: "Flotilla Chat",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SystemBars: {
      insetsHandling: "css",
    },
    SplashScreen: {
      androidSplashResourceName: "splash",
    },
    Keyboard: {
      style: "DARK",
    },
    Badge: {
      persist: true,
      autoClear: true,
    },
  },
  server: {
    // Use this for live reload https://capacitorjs.com/docs/guides/live-reload
    // url: "http://192.168.1.17:1847",
    // cleartext: true,
  },
}

export default config
