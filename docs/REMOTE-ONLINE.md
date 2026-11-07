# Online phone remote

On the laptop, choose Sync and sign in. Open Stream → Phone remote · online Sync, then Start. Scan the QR code with the phone camera (or copy/share the private link), and sign in to KOGG Sync on the phone. The current passage appears with Previous, Next, Blank and Resume.

Both devices need internet; keep the laptop operator open. No Node bridge, install or new database table is required. The phone does not pull, merge or write the saved library. A signed-in person with the pairing link can control this presentation: share only with the intended operator.

Each tap waits for the laptop's completed action and returns the updated preview. Repeated copies of a command execute once. Old-screen commands are rejected and refresh the preview. If confirmation is lost, do not assume the command failed: check the laptop before retrying. Controls pause when the laptop or network disappears; returning to the phone asks for current state. Reconnect is available when needed.

Stop remote on the laptop revokes that session immediately without blanking the projector. Start again creates a fresh private link. Links expire after 12 hours. Signing out, switching away from Sync or closing the laptop operator ends control. If the phone was asleep when a session ended, scan the new code rather than reusing the old one.

QR codes are generated locally from the private link, never sent to a QR website. The small QR encoder loads only when pairing starts. Remote payloads use AES-GCM with a random key carried in the URL fragment; the key is not sent in the HTTP request or stored in the library. Supabase Broadcast carries encrypted packets. Local session storage retains pairing across a phone refresh and Disconnect clears it.

Validation: automated controller tests exercise delayed completion, duplicate commands, stale revisions, network restoration, sign-out, expiration, revocation and missing acknowledgements. Actual two-device signed-in acceptance remains a separate check; no passwords or test accounts are created by this implementation.

Transport reference: https://supabase.com/docs/guides/realtime/broadcast

QR dependency: qrcode-generator 2.0.4 (Kazuhiko Arase, MIT), vendored at js/vendor/qrcode.js from the npm registry. Original copyright/license notice is retained in that file. Source: https://github.com/kazuhikoarase/qrcode-generator
