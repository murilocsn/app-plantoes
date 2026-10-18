import { Component, type ReactNode } from "react";
import { Brand } from "./Brand";
import { Button } from "./Button";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="loading-screen">
          <Brand />
          <h1>Não foi possível abrir esta tela</h1>
          <p>
            Verifique sua conexão e atualize o aplicativo. Uma nova versão pode estar disponível.
          </p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Atualizar aplicativo
          </Button>
        </main>
      );
    }
    return this.props.children;
  }
}
