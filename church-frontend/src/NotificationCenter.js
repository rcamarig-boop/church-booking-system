import React, { useState } from 'react';

export default function NotificationCenter({ items }) {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type) => ({ new_booking:'✅', deleted:'❌', config:'⚙️', info:'ℹ️' }[type]||'📌');
  const getColor = (type) => ({ new_booking:'#48bb78', deleted:'#f56565', config:'#ed8936', info:'#667eea' }[type]||'#718096');

  return (
    <>
      <div className="notification-wrapper">
        <button onClick={()=>setIsOpen(!isOpen)} className="notification-bell">
          🔔 {items.length>0 && <span className="notification-badge">{items.length>9?'9+':items.length}</span>}
        </button>

        {isOpen && <div className="notification-popup">
          <div className="notification-header">
            <span>📬 Notifications ({items.length})</span>
            <button onClick={()=>setIsOpen(false)}>✕</button>
          </div>
          {items.length===0 ? <div className="notification-empty">📭 No notifications</div> :
            <ul className="notification-list">
              {items.map((n,i)=>(<li key={i} style={{borderLeft:`4px solid ${getColor(n.type)}`}}>
                <div>{getIcon(n.type)} {n.text}</div>
                <div style={{fontSize:'11px', color:'#a0aec0'}}>{n.type}</div>
              </li>))}
            </ul>
          }
        </div>}
      </div>
    </>
  );
}
