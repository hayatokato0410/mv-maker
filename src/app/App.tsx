import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AppProvider, useApp } from './context/AppContext';
import { I18nProvider } from './context/I18nContext';
import { ThemeProvider } from './context/ThemeContext';
import { ImportScreen } from './components/ImportScreen';
import { EditScreen } from './components/EditScreen';
import { ShareScreen } from './components/ShareScreen';

function AppInner() {
  const { screen } = useApp();
  return (
    <>
      {screen === 'import' && <ImportScreen />}
      {screen === 'edit' && <EditScreen />}
      {screen === 'share' && <ShareScreen />}
    </>
  );
}

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <I18nProvider>
        <ThemeProvider>
          <AppProvider>
            <AppInner />
          </AppProvider>
        </ThemeProvider>
      </I18nProvider>
    </DndProvider>
  );
}
