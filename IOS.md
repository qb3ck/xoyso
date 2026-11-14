# xoyso on iPhone (no App Store)

The app is a thin Capacitor wrapper that loads https://xoyso.vercel.app, so every push to `main` reaches the phone
with no new build. The phone needs a Wi-Fi or mobile connection for the app itself (it does not need Safari).

## One-time setup (Mac with Xcode)
1. `bash scripts/ios-setup.sh` (installs, creates the `ios/` project, sets the icon, opens Xcode).
2. In Xcode: click **App** > **Signing & Capabilities** > tick *Automatically manage signing* > choose your Apple ID as Team.
   If the bundle id `com.xoyso.app` is taken, change it to something unique (also in `capacitor.config.json`).
3. Plug in the iPhone (Settings > Privacy & Security > Developer Mode on), pick it as the run target, press Run.
4. On the phone: Settings > General > VPN & Device Management > trust your Apple ID.

Free Apple ID: the app stops opening after 7 days and must be re-run from Xcode. Paid Apple Developer account ($99/yr):
lasts a year, or use TestFlight (builds last 90 days).

## Assistive Access
Settings > Accessibility > Assistive Access > Set Up Assistive Access > choose xoyso as an allowed app, leave Safari off.
