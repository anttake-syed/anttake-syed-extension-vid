import React from 'react';
import './index.css';

function App() {
  const mockCaptures = [
    { id: 1, title: 'Project Demo', type: 'video', date: '2 hours ago', size: '12.4 MB' },
    { id: 2, title: 'Bug Report - UI', type: 'image', date: '5 hours ago', size: '2.1 MB' },
    { id: 3, title: 'Feature Walkthrough', type: 'video', date: 'Yesterday', size: '45.8 MB' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">AntCapture</div>
        <nav>
          <ul className="nav-list">
            <li className="nav-item active">Dashboard</li>
            <li className="nav-item">My Library</li>
            <li className="nav-item">Settings</li>
            <li className="nav-item">Cloud Connect</li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="title-section">
            <h1>Capture Library</h1>
            <p>Your recent recordings and screenshots across all devices.</p>
          </div>
          <button className="btn-primary">Connect Drive</button>
        </header>

        <section className="media-grid">
          {mockCaptures.map(item => (
            <div key={item.id} className="media-card">
              <div className="media-preview">
                <div style={{fontSize: '40px'}}>{item.type === 'video' ? '🎬' : '🖼️'}</div>
              </div>
              <div className="media-info">
                <div className="media-title">{item.title}</div>
                <div className="media-meta">
                  <span>{item.date} • {item.size}</span>
                  <span className={`tag ${item.type}`}>{item.type}</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;

