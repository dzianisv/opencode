// Shim: global-sdk was renamed to server-sdk in upstream (#28790).
// Fork files still use useGlobalSDK; re-export from server-sdk for compatibility.
export { useServerSDK as useGlobalSDK } from "./server-sdk"
