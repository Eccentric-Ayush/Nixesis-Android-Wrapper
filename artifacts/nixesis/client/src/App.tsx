import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { NIXESIS_APP_URL } from "@shared/const";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function NativeAppEvents() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let removeListeners: (() => void) | undefined;

    const backListener = CapacitorApp.addListener("backButton", () => {
      if (location !== "/") {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          setLocation("/", { replace: true });
        }
        return;
      }
      void CapacitorApp.exitApp();
    });
    const urlListener = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      if (url.startsWith(NIXESIS_APP_URL)) {
        setLocation("/", { replace: true });
      }
    });

    void Promise.all([backListener, urlListener]).then(([back, url]) => {
      const cleanup = () => {
        void back.remove();
        void url.remove();
      };
      if (disposed) cleanup();
      else removeListeners = cleanup;
    });

    return () => {
      disposed = true;
      removeListeners?.();
    };
  }, [location, setLocation]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <WouterRouter hook={Capacitor.isNativePlatform() ? useHashLocation : undefined}>
            <NativeAppEvents />
            <Router />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
