import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TabBar } from "./components/layout/TabBar";
import { MainPanel } from "./components/layout/MainPanel";
import { CreateSessionDialog } from "./components/session/CreateSessionDialog";
import { CreateProjectDialog } from "./components/session/CreateProjectDialog";
import { SettingsPage } from "./components/settings/SettingsPage";
import { ClaudeGuidePage } from "./components/guide/ClaudeGuidePage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useProjectStore } from "./state/projectStore";
import { useSessionStore } from "./state/sessionStore";
import { listenToSessionStateChanged, listenToTerminalExited, getHomeDir } from "./lib/tauri";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSettingsStore } from "./state/settingsStore";

function App() {
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [preSelectedProjectId, setPreSelectedProjectId] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { loadProjects, createProject } = useProjectStore();
  const { loadSessions, updateSessionState } = useSessionStore();
  const { loadSettings } = useSettingsStore();

  // Initialize data on mount
  useEffect(() => {
    const init = async () => {
      await loadSettings();
      await loadProjects();
      await loadSessions();

      // Create a default project if none exists
      const { projects } = useProjectStore.getState();
      if (projects.length === 0) {
        try {
          const homeDir = await getHomeDir();
          await createProject("Default", homeDir);
        } catch {
          // Project may already exist
        }
      }
    };
    init();
  }, [loadProjects, loadSessions, createProject, loadSettings]);

  // Listen for session state changes
  useEffect(() => {
    const unlistenState = listenToSessionStateChanged((event) => {
      // Exited state is handled by terminal-exited listener which includes exitCode
      if (event.state !== "Exited") {
        updateSessionState(event.sessionId, event.state);
      }
    });

    const unlistenExited = listenToTerminalExited((event) => {
      updateSessionState(event.sessionId, "Exited", event.exitCode);
    });

    return () => {
      unlistenState.then((fn) => fn());
      unlistenExited.then((fn) => fn());
    };
  }, [updateSessionState]);

  const handleNewSession = useCallback((projectId?: string) => {
    setPreSelectedProjectId(projectId);
    setShowNewSessionDialog(true);
  }, []);

  const handleNewProject = useCallback(() => {
    setShowNewProjectDialog(true);
  }, []);

  const handleSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleGuide = useCallback(() => {
    setShowGuide(true);
  }, []);

  useKeyboardShortcuts(() => handleNewSession(), handleSettings);

  return (
    <ErrorBoundary>
      <div className="w-screen h-screen flex overflow-hidden">
        <Sidebar
          onNewSession={handleNewSession}
          onNewProject={handleNewProject}
          onSettings={() => setShowSettings(true)}
          onGuide={handleGuide}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TabBar onNewSession={() => handleNewSession()} />
          <div className="flex-1 flex overflow-hidden">
            <MainPanel />
          </div>
        </div>
        <CreateSessionDialog
          open={showNewSessionDialog}
          onClose={() => {
            setShowNewSessionDialog(false);
            setPreSelectedProjectId(undefined);
          }}
          preSelectedProjectId={preSelectedProjectId}
        />
        <CreateProjectDialog
          open={showNewProjectDialog}
          onClose={() => setShowNewProjectDialog(false)}
        />
        <SettingsPage
          open={showSettings}
          onClose={() => setShowSettings(false)}
        />
        <ClaudeGuidePage
          open={showGuide}
          onClose={() => setShowGuide(false)}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
