import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useWorkflowStore from '../useWorkflowStore';

describe('useWorkflowStore Undo/Redo', () => {
    // Capture initial state
    const initialState = useWorkflowStore.getState();

    beforeEach(() => {
        useWorkflowStore.setState(initialState);
        useWorkflowStore.temporal.getState().clear();
    });

    it('should track history and support undo/redo', () => {
        const { temporal } = useWorkflowStore;

        // Initial state
        expect(useWorkflowStore.getState().nodes).toEqual([]);
        expect(temporal.getState().pastStates.length).toBe(0);

        // Add a node
        act(() => {
            useWorkflowStore.getState().addNode({
                id: '1',
                type: 'test',
                position: { x: 0, y: 0 },
                data: { label: 'Node 1' },
            });
        });

        expect(useWorkflowStore.getState().nodes).toHaveLength(1);
        expect(temporal.getState().pastStates.length).toBeGreaterThan(0);

        // Undo
        act(() => {
            temporal.getState().undo();
        });

        expect(useWorkflowStore.getState().nodes).toHaveLength(0);
        expect(temporal.getState().futureStates.length).toBeGreaterThan(0);

        // Redo
        act(() => {
            temporal.getState().redo();
        });

        expect(useWorkflowStore.getState().nodes).toHaveLength(1);
        expect(useWorkflowStore.getState().nodes[0].id).toBe('1');
    });

    it('should limit history size', () => {
        const { temporal } = useWorkflowStore;
        const limit = 50;

        for (let i = 0; i < limit + 10; i++) {
            act(() => {
                useWorkflowStore.getState().addNode({
                    id: `${i}`,
                    type: 'test',
                    position: { x: 0, y: 0 },
                    data: { label: `Node ${i}` },
                });
            });
        }

        expect(temporal.getState().pastStates.length).toBeLessThanOrEqual(limit);
    });
});
