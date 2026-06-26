import { Component } from "react";

// Captura erros de render em qualquer lugar abaixo dele e mostra um fallback em vez
// da tela branca. `onReset` deixa o usuário voltar ao início sem recarregar a página.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // log para o console (sem derrubar a app); útil em produção também.
    console.error("ErrorBoundary capturou:", error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="app app-full">
          <div className="screen center-screen error-screen">
            <div className="error-emoji" aria-hidden>⚽💥</div>
            <h1 className="error-title">Algo quebrou nessa tela</h1>
            <p className="muted error-msg">{String(this.state.error?.message || this.state.error)}</p>
            <div className="error-actions">
              <button className="btn btn-primary" onClick={this.reset}>Voltar ao início</button>
              <button className="btn btn-ghost" onClick={() => location.reload()}>Recarregar</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
