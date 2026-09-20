import { AppShell } from './components/layout/AppShell';
import type { DashboardConfig } from './appConfigs/types';

interface AppProps {
  config: DashboardConfig;
}

export default function App({ config }: AppProps) {
  return <AppShell config={config} />;
}
