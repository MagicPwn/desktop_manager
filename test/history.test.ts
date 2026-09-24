import test from "node:test";
import assert from "node:assert/strict";
import { createHistory, executeCommand, redo, undo } from "../src/application/history.js";

test("command history executes, undoes and redoes", () => {
  const command = {
    label: "increment",
    execute: (value: number) => value + 1,
    undo: (value: number) => value - 1,
  };
  const executed = executeCommand(createHistory(1), command);
  assert.equal(executed.present, 2);
  const undone = undo(executed);
  assert.equal(undone.present, 1);
  assert.equal(redo(undone).present, 2);
});

test("executing a new command clears redo history", () => {
  const command = { label: "increment", execute: (value: number) => value + 1, undo: (value: number) => value - 1 };
  const undone = undo(executeCommand(createHistory(1), command));
  const next = executeCommand(undone, command);
  assert.equal(next.redoStack.length, 0);
});
