/**
 * WxCC Override Manager — Supervisor Desktop Widget
 *
 * Custom element: <wxcc-override-manager access-token="..." />
 *
 * Usage in a WxCC desktop layout:
 *   "comp": "wxcc-override-manager",
 *   "script": "https://<your-app>.vercel.app/wxcc-override-widget.js",
 *   "attributes": { "access-token": "$STORE.auth.accessToken" }
 *
 * The element derives the app URL from the script's own src so no
 * hardcoded URL is needed — the same file works in any environment.
 *
 * Auth flow:
 *   1. Desktop passes its access token as an attribute.
 *   2. Component creates an iframe pointing to /embed on the same origin.
 *   3. After iframe loads, the token is posted via postMessage.
 *   4. The embed page exchanges it for a session cookie and renders.
 *   5. When the desktop refreshes its token the attribute update re-posts,
 *      keeping the embedded session current.
 *
 * Note on microphone access: WAV recording requires the browser to grant
 * microphone permission to the iframe. This works when the WxCC desktop
 * page does not restrict the microphone Permissions Policy for iframes.
 * TTS editing and override activation/deactivation work without microphone.
 */
(function () {
  const scriptSrc = document.currentScript && document.currentScript.src;
  const appOrigin = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;

  class WxccOverrideManager extends HTMLElement {
    constructor() {
      super();
      this._iframe = null;
      this._token = null;
      this._iframeReady = false;
    }

    static get observedAttributes() {
      return ["access-token"];
    }

    attributeChangedCallback(name, _oldVal, newVal) {
      if (name === "access-token" && newVal && newVal !== _oldVal) {
        this._token = newVal;
        this._maybePostToken();
      }
    }

    connectedCallback() {
      this.style.cssText = "display:block;width:100%;height:100%;";

      const iframe = document.createElement("iframe");
      iframe.src = appOrigin + "/embed";
      iframe.allow = "microphone";
      iframe.style.cssText = "width:100%;height:100%;border:none;";

      iframe.addEventListener("load", () => {
        this._iframeReady = true;
        this._maybePostToken();
      });

      this.appendChild(iframe);
      this._iframe = iframe;
    }

    disconnectedCallback() {
      this._iframe = null;
      this._iframeReady = false;
    }

    _maybePostToken() {
      if (this._iframeReady && this._token && this._iframe && this._iframe.contentWindow) {
        this._iframe.contentWindow.postMessage(
          { type: "wxcc-override-token", accessToken: this._token },
          appOrigin
        );
      }
    }
  }

  if (!customElements.get("wxcc-override-manager")) {
    customElements.define("wxcc-override-manager", WxccOverrideManager);
  }
})();
