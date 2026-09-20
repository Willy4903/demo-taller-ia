import { AppShell } from './components/layout/AppShell';
import { useAutoLoadSample } from './hooks/useAutoLoadSample';

export default function App() {
  useAutoLoadSample();
  return <AppShell />;
}
