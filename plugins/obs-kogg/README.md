# KOGG Connect for OBS — Windows preview

A native OBS source that starts its connection with OBS and bundles KOGG's existing display renderer. No Node installation, terminal, cloud account or separate bridge process is needed for this OBS path.

## Setup

1. Close OBS and run the supplied Windows installer. Restart OBS.
2. Sources → + → **KOGG Presenter**. Reuse **Add existing** across scenes.
3. Its properties show an eight-character code, valid for ten minutes. In KOGG, select **Stream → KOGG Connect**, enter the code and click **Connect OBS**. Allow browser local-network access if prompted.
4. Send a verse and inspect OBS's preview. Set the source's Output to full presentation, transparent text, separate broadcast, or name tags/alerts only. Fit the 1920 × 1080 source to your scene.

For lower thirds, choose Separate broadcast and set **Stream → Layouts → Lower third** in KOGG. Room output remains independent. Blank clears the presentation and overlays. Refresh the pairing code when it expires. Disconnect in KOGG to blank the feed, or **Disconnect and forget all presenters** in OBS to revoke every saved pairing.

The paired browser remembers the connection and retries after OBS restarts. Only one presenter tab can hold the ten-second renewable connection lease. Reusing the source in other scenes does not create another presenter window. Multiple source types can intentionally receive the same presentation.

## Offline and scope

The plugin serves its bundled HTML, JavaScript, fonts and logos exclusively on `127.0.0.1:8767`. Presentation data and referenced uploaded images are sent from KOGG; Bibles, libraries and account credentials are not copied. Load KOGG's offline essentials before disconnecting from the internet. OBS and the presenter must run on the same computer. The plugin does not implement the separate Wi-Fi phone server; online Sync remote still uses internet and same-Wi-Fi remote still uses the optional LAN bridge.

Windows x64 and OBS 32 are the first build target. macOS, Linux, Windows ARM and older OBS versions are not yet supported. The browser's permission/security policy must allow the loopback connection; Window Capture remains the fallback. No claim of hardware acceptance until the manual checklist passes.

## Validation checklist

- [ ] Native source renders in OBS 32 on Windows (Chrome and Edge).
- [ ] Hosted HTTPS app pairs after local-network permission.
- [ ] Restart OBS and confirm saved pairing reconnects.
- [ ] Disconnect internet after offline readiness; text and uploaded backgrounds still render.
- [ ] Full, transparent, lower-third and graphics-only modes; Blank clears all.
- [ ] Reuse source in several scenes without extra presenter windows.
- [ ] Expired/wrong codes, revoked pairing and competing tabs fail clearly.
- [ ] Installer and uninstall tested on a clean standard-user Windows account.

Build/package instructions and validation evidence are maintained with the project progress log. Native source is GPL-2.0-or-later; OBS is separately licensed by its authors. No OBS binaries are redistributed.
