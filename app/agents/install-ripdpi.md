---
name: install-ripdpi
description: Help a user download, verify and install RIPDPI, the open-source Android network-path diagnostics and optimization toolkit, and choose between its VPN mode and proxy mode. Use when the user asks how to get RIPDPI, which APK to pick, or how to start it on Android.
---

# Install RIPDPI

RIPDPI is an Android app. It finds out why a site does not open on the user's network, applies TCP, TLS and QUIC strategies on the device, and can route through relays the user controls. Website: https://ripdpi.dev. Source: https://github.com/po4yka/RIPDPI (AGPL-3.0-only).

## 1. Check the device

- Android 8.1 or later. Ask the user if you do not know.
- Root is not needed. On a rooted device an optional helper unlocks raw-socket operations.

## 2. Pick the APK

Open the latest release: https://github.com/po4yka/RIPDPI/releases/latest

There are two builds of the same app:

- `app-github-release-<abi>.apk`: for direct install. It can update itself from GitHub Releases after the user agrees.
- `app-fdroid-release-<abi>.apk`: for F-Droid or a compatible client, which then handles updates.

Pick the ABI:

- `arm64-v8a` for almost all phones from 2017 on.
- `armeabi-v7a` for old 32-bit phones.
- `x86_64` or `x86` for emulators and some Chromebooks.
- `universal` if unsure. It is larger but runs on every ABI.

On a device with adb, `adb shell getprop ro.product.cpu.abi` prints the ABI.

## 3. Verify the download

Each release has a `SHA256SUMS` file. Compare the APK hash with the line for its file name:

```bash
sha256sum app-github-release-arm64-v8a.apk
```

Do not install an APK whose hash does not match.

## 4. Install

- On the phone: open the APK and allow "Install unknown apps" for the browser or file manager when Android asks.
- From a computer: `adb install app-github-release-arm64-v8a.apk`.

Both builds use the application ID `com.poyka.ripdpi`. Switching between them works only when the signing certificates match; if Android refuses, uninstall first.

## 5. Choose a mode

- VPN mode: Android's VpnService routes the device's traffic through a local bridge on the phone. Use it for the whole device. It is not a remote VPN service.
- Proxy mode: a SOCKS5 proxy on localhost. Use it to send only the apps that support a proxy.

Then run Diagnostics to see where the path fails, and connect.

## Limits

- RIPDPI is in active development. Breaking changes are possible; read the release notes before an upgrade.
- The project's own relay service is invite-only. Do not search for or guess its servers.
- Normal operation does not capture packets, keep traffic payloads or record TLS secrets.
