import React from 'react';
import { Handle, Position } from 'reactflow';

export default function DialogNode({ id, data }) {
  const text = data.text || '';
  const truncated = text.length > 60 ? text.slice(0, 57) + '...' : text;

  return (
    <div style={{ padding: 10, border: '1px solid #555', background: '#fff', borderRadius: 4, minWidth: 160 }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ fontWeight: 'bold' }}>{id}</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>{truncated}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
