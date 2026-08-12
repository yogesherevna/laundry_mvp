import React from 'react';
import ReactDOM from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';
import { initDatabase } from './db/database';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';
import './theme/app.css';
import App from './App';

setupIonicReact();

async function start() {
  await initDatabase();
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>
  );
}

start().catch((error) => {
  console.error(error);
  document.getElementById('root')!.innerHTML =
    `<div style="padding:24px;font-family:Arial">
      <h2>डेटाबेस सुरू करता आला नाही</h2>
      <p>${String(error)}</p>
      <p>Browser पुन्हा उघडा किंवा npm install पुन्हा चालवा.</p>
    </div>`;
});