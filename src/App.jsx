import React from 'react';
import ReactFlow, { addEdge, MiniMap, Controls, Background, ReactFlowProvider, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import DialogNode from './DialogNode.jsx';

const nodeTypes = { dialog: DialogNode };

function scriptToFlow(script) {
  const nodes = [];
  const edges = [];
  script.forEach((node, idx) => {
    nodes.push({
      id: node.id,
      type: 'dialog',
      position: { x: idx * 200, y: idx * 80 },
      data: { speaker: node.speaker || '', text: node.text || '' }
    });
    if (node.next) {
      edges.push({ id: `${node.id}-${node.next}`, source: node.id, target: node.next, label: '' });
    }
    if (node.choices) {
      node.choices.forEach((c, i) => {
        edges.push({ id: `${node.id}-c${i}`, source: node.id, target: c.next, label: c.text });
      });
    }
  });
  return [nodes, edges];
}

function flowToScript(nodes, edges) {
  const out = [];
  const edgesBySource = {};
  edges.forEach(e => {
    if (!edgesBySource[e.source]) edgesBySource[e.source] = [];
    edgesBySource[e.source].push(e);
  });
  nodes.forEach(n => {
    const obj = { id: n.id, speaker: n.data.speaker, text: n.data.text };
    const outs = edgesBySource[n.id] || [];
    const choices = outs.filter(e => e.label);
    if (choices.length) {
      obj.choices = choices.map(e => ({ text: e.label, next: e.target }));
    } else if (outs.length === 1) {
      obj.next = outs[0].target;
    }
    out.push(obj);
  });
  return out;
}

function validate(nodes, edges, startId) {
  const bySource = {};
  edges.forEach(e => {
    if (!bySource[e.source]) bySource[e.source] = [];
    bySource[e.source].push(e.target);
  });
  const visited = new Set([startId]);
  const q = [startId];
  while (q.length) {
    const id = q.shift();
    const nexts = bySource[id] || [];
    if (nexts.length === 0) return true;
    nexts.forEach(n => { if (!visited.has(n)) { visited.add(n); q.push(n); } });
  }
  return false;
}

function NodeEditor({ node, nodes, edges, updateNode, addChoice, removeEdge, changeEdge }) {
  const related = edges.filter(e => e.source === node.id);
  return (
    <div>
      <input value={node.data.speaker} onChange={e => updateNode(node.id, 'speaker', e.target.value)} placeholder="Speaker" />
      <textarea rows="3" value={node.data.text} onChange={e => updateNode(node.id, 'text', e.target.value)} placeholder="Text" />
      <h4>Choices</h4>
      {related.map(e => (
        <div key={e.id} style={{ border: '1px solid #ccc', padding: '4px', marginBottom: '4px' }}>
          <input value={e.label} onChange={ev => changeEdge(e.id, { label: ev.target.value })} placeholder="Choice text" />
          <select value={e.target} onChange={ev => changeEdge(e.id, { target: ev.target.value })}>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.id}</option>
            ))}
          </select>
          <button onClick={() => removeEdge(e.id)}>x</button>
        </div>
      ))}
      <button onClick={() => addChoice(node.id)}>Add Choice</button>
    </div>
  );
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = React.useState(null);

  React.useEffect(() => {
    fetch('/data/dialog.json').then(r => r.json()).then(data => {
      const [n, e] = scriptToFlow(data);
      setNodes(n);
      setEdges(e);
    });
  }, []);

  const onConnect = React.useCallback(params => setEdges(eds => addEdge({ ...params, label: '' }, eds)), []);

  const updateNode = (id, field, value) => setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n));

  const addChoice = sourceId => setEdges(eds => [...eds, { id: `e${eds.length}`, source: sourceId, target: sourceId, label: 'choice' }]);

  const removeEdge = id => setEdges(eds => eds.filter(e => e.id !== id));

  const changeEdge = (id, data) => setEdges(eds => eds.map(e => e.id === id ? { ...e, ...data } : e));

  const addNodeButton = () => {
    const id = `node${nodes.length + 1}`;
    setNodes(ns => [
      ...ns,
      {
        id,
        type: 'dialog',
        position: { x: 50 * ns.length, y: 50 * ns.length },
        data: { speaker: '', text: '' }
      }
    ]);
  };

  const [validationMsg, setValidationMsg] = React.useState('');

  React.useEffect(() => {
    const ok = validate(nodes, edges, 'start');
    setValidationMsg(ok ? 'Valid path exists' : 'Dialogue has no end path');
  }, [nodes, edges]);

  const saveJson = () => {
    const script = flowToScript(nodes, edges);
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dialog.json';
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <ReactFlowProvider>
      <div id="reactflow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(e, node) => setSelected(node)}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <div id="sidebar">
        <h3>Edit Node</h3>
        {selected && (
          <NodeEditor
            node={selected}
            nodes={nodes}
            edges={edges}
            updateNode={updateNode}
            addChoice={addChoice}
            removeEdge={removeEdge}
            changeEdge={changeEdge}
          />
        )}
        <div id="validation" style={{ marginTop: '10px', fontWeight: 'bold' }}>
          {validationMsg}
        </div>
        <button onClick={addNodeButton} id="add-node">Add Node</button>
        <button onClick={saveJson} id="save-json">Download JSON</button>
      </div>
    </ReactFlowProvider>
  );
}

