export interface StateCommand<T> {
  label: string;
  execute(state: T): T;
  undo(state: T): T;
}

export interface HistoryState<T> {
  present: T;
  undoStack: StateCommand<T>[];
  redoStack: StateCommand<T>[];
}

export function createHistory<T>(present: T): HistoryState<T> {
  return { present, undoStack: [], redoStack: [] };
}

export function executeCommand<T>(history: HistoryState<T>, command: StateCommand<T>): HistoryState<T> {
  return {
    present: command.execute(history.present),
    undoStack: [...history.undoStack, command].slice(-50),
    redoStack: [],
  };
}

export function undo<T>(history: HistoryState<T>): HistoryState<T> {
  const command = history.undoStack.at(-1);
  if (!command) return history;
  return {
    present: command.undo(history.present),
    undoStack: history.undoStack.slice(0, -1),
    redoStack: [...history.redoStack, command],
  };
}

export function redo<T>(history: HistoryState<T>): HistoryState<T> {
  const command = history.redoStack.at(-1);
  if (!command) return history;
  return {
    present: command.execute(history.present),
    undoStack: [...history.undoStack, command],
    redoStack: history.redoStack.slice(0, -1),
  };
}
