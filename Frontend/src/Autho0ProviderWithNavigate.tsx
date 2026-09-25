import { Auth0Provider } from "@auth0/auth0-react"
import { useNavigate } from "react-router-dom"
import type { AppState } from "@auth0/auth0-react"
import React from "react"

export default function Auth0ProviderWithNavigate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  return (
    <Auth0Provider
      domain="dev-68jvyiiecex8hfp6.us.auth0.com"
      clientId="j3xcoviKss25raTMk9dgCQN14TLsRz7B"
      authorizationParams={{ redirect_uri: window.location.origin }}
      onRedirectCallback={(appState: AppState | undefined) => {
        navigate(appState?.returnTo ?? '/')
      }}
    >
      {children}
    </Auth0Provider>
  )
}