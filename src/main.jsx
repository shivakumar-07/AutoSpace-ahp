import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreContext, useStoreProvider } from './store'
import App from './App.jsx'

function Root() {
  const store = useStoreProvider();
  return (
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
