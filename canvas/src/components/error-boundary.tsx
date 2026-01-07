// Error Boundary for Canvas Components
// Catches rendering errors and displays a fallback UI

import React, { Component, type ReactNode } from "react";
import { Box, Text } from "ink";

interface Props {
  children: ReactNode;
  canvasKind?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details
    console.error("Canvas rendering error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      const { canvasKind } = this.props;
      const { error } = this.state;

      return (
        <Box
          flexDirection="column"
          padding={2}
          borderStyle="round"
          borderColor="red"
        >
          <Text color="red" bold>
            Canvas Error
          </Text>
          <Box marginTop={1}>
            <Text color="yellow">
              {canvasKind ? `The ${canvasKind} canvas` : "A canvas"} encountered
              an error:
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">{error?.message || "Unknown error"}</Text>
          </Box>
          <Box marginTop={2}>
            <Text color="gray" dimColor>
              Press Ctrl+C to exit
            </Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
