import React from 'react';
export default function Notifications({ items }) {
  const getIcon = (type) => {
    const icons = {
      'new_booking': '✅',
      'deleted': '❌',
      'config': '⚙️',
      'info': 'ℹ️'
    };
    return icons[type] || '📌';
  }

  const getColor = (type) => {
    const colors = {
      'new_booking': '#48bb78',
      'deleted': '#f56565',
      'config': '#ed8936',
      'info': '#667eea'
    };
    return colors[type] || '#718096';
  }

  return (
    <div>
      {items.length === 0 && <div style={{ textAlign:'center', color:'#a0aec0', padding:'40px 20px', fontSize:'14px' }}>📭 No notifications yet</div>}
      <ul style={{ listStyle:'none', padding:0, margin:0 }}>
        {items.map((n,i)=> (
          <li key={i} style={{ 
            padding:'12px', 
            borderBottom:'1px solid #e2e8f0',
            borderLeft:'4px solid ' + getColor(n.type),
            background:'white',
            marginBottom:'8px',
            borderRadius:'6px',
            fontSize:'13px'
          }}>
            <div style={{ fontWeight:600, color:'#2d3748', marginBottom:'4px' }}>
              {getIcon(n.type)} {n.text}
            </div>
            <div style={{ fontSize:'11px', color:'#a0aec0', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              {n.type}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
