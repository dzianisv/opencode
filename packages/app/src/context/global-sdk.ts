// Shim: global-sdk was renamed to server-sdk in upstream (#28790).
// Fork files still use useGlobalSDK; re-export from server-sdk for compatibility.
// useServerSDK returns Accessor<ServerSDK>; unwrap it to match old API shape.
import { useServerSDK } from "./server-sdk"

export function useGlobalSDK() {
  return useServerSDK()()
}
