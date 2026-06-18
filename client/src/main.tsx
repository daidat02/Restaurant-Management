import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { Provider } from "react-redux"
import { PersistGate } from "redux-persist/integration/react"
import "./index.css"
import { store, persistor } from "./redux/store/store"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <PersistGate loading={<h1>Đang tải dữ liệu Redux...</h1>} persistor={persistor}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistGate>
  </Provider> 
) 