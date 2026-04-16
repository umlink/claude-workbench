import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TabBar } from "./components/layout/TabBar";
import { MainPanel } from "./components/layout/MainPanel";
import { RightPanel } from "./components/layout/RightPanel";
import { CreateSessionDialog } from "./components/session/CreateSessionDialog";
import { CreateProjectDialog } from "./components/session/CreateProjectDialog";
import { SettingsPage } from "./components/settings/SettingsPage";
import { useProjectStore } from "./state/projectStore";
import { useSessionStore } from "./state/sessionStore";
import { listenToSessionStateChanged, listenToTerminalExited, listenToTerminalOutput, replaySession } from "./lib/tauri";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function App() {
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [preSelectedProjectId, setPreSelectedProjectId] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const { loadProjects, createProject } = useProjectStore();
  const { loadSessions, updateSessionState, appendSessionOutput, setSessionOutput } = useSessionStore();

  // Initialize data on mount
  useEffect(() => {
    const init = async () => {
      await loadProjects();
      await loadSessions();

      // Load session outputs for all sessions
      const { sessions: currentSessions } = useSessionStore.getState();
      for (const session of currentSessions) {
        try {
          const chunks = await replaySession(session.id);
          setSessionOutput(session.id, chunks);
        } catch {
          // Ignore errors loading session output
        }
      }

      // Create a default project if none exists
      const { projects } = useProjectStore.getState();
      if (projects.length === 0) {
        try {
          await createProject("Default", "/Users/krlin");
        } catch {
          // Project may already exist
        }
      }
    };
    init();
  }, [loadProjects, loadSessions, createProject, setSessionOutput]);

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

    const unlistenOutput = listenToTerminalOutput((event) => {
      appendSessionOutput(event.sessionId, event.chunk);
    });

    return () => {
      unlistenState.then((fn) => fn());
      unlistenExited.then((fn) => fn());
      unlistenOutput.then((fn) => fn());
    };
  }, [updateSessionState, appendSessionOutput]);

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

  useKeyboardShortcuts(() => handleNewSession(), handleSettings);

  return (
    <div className="w-screen h-screen flex overflow-hidden">
      <Sidebar
        onNewSession={handleNewSession}
        onNewProject={handleNewProject}
        onSettings={() => setShowSettings(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TabBar onNewSession={() => handleNewSession()} />
        <div className="flex-1 flex overflow-hidden">
          <MainPanel />
          <RightPanel />
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
    </div>
  );
}

export default App;
