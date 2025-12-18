import React, { useState } from 'react';

export default function NotificationCenter({ items }) {
  const [open,setOpen] = useState(false);
  const getColor = (type)=>({new_booking:'#48bb78',deleted:'#f56565',config:'#ed8936',info:'#667eea'}[type]||'#718096');
  const getIcon = (type)=>({new_booking:'✅',deleted:'❌',config:'⚙️',info:'ℹ️'}[type]||'📌');

  return (
    <div style={{position:'fixed',bottom:20,right:20,zIndex:999}}>
      <button onClick={()=>setOpen(!open)} style={{width:60,height:60,borderRadius:'50%',border:'none',cursor:'pointer', fontSize:24, background:'linear-gradient(135deg,#667eea,#764ba2)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
        🔔 {items.length>0 && <span style={{position:'absolute',top:-6,right:-6,width:26,height:26,borderRadius:'50%',background:'#f56565',color:'white',fontSize:12,fontWeight:'bold',display:'flex',alignItems:'center',justifyContent:'center'}}>{items.length>9?'9+':items.length}</span>}
      </button>
      {open && <div style={{position:'absolute',bottom:80,right:0,width:360,maxHeight:'70vh',background:'white',borderRadius:12,boxShadow:'0 10px 40px rgba(0,0,0,0.15)',overflowY:'auto'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center',fontWeight:600}}>
          📬 Notifications ({items.length}) <button onClick={()=>setOpen(false)} style={{border:'none',background:'transparent',cursor:'pointer',fontSize:18,color:'#a0aec0'}}>✕</button>
        </div>
        {items.length===0 ? <div style={{padding:32,textAlign:'center',color:'#a0aec0'}}>📭 No notifications</div> :
          <ul style={{listStyle:'none',margin:0,padding:0}}>
            {items.map((n,i)=><li key={i} style={{padding:12,borderBottom:'1px solid #e2e8f0',borderLeft:`4px solid ${getColor(n.type)}`,background:'#fff'}}>
              <div style={{fontWeight:600,color:'#2d3748'}}>{getIcon(n.type)} {n.text}</div>
              <div style={{fontSize:11,color:'#a0aec0',textTransform:'uppercase',marginTop:4}}>{n.type}</div>
            </li>)}
          </ul>
        }
      </div>}
    </div>
  );
}
