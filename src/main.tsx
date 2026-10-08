import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { App } from "./app/App"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minuto por defecto
      refetchOnWindowFocus: false, // Controlado mas finamente donde se necesite
      retry: 1
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

