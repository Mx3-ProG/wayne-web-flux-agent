"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

export class MascotErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unable to render the FLUX mascot", { error, info });
  }

  render() {
    if (this.state.failed) {
      return (
        <p role="status">
          Le personnage 3D n’est pas disponible sur cet appareil. L’aide FLUX
          reste entièrement accessible.
        </p>
      );
    }
    return this.props.children;
  }
}
