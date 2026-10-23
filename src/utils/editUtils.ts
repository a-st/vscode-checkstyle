// Copyright (c) jdneo. All rights reserved.
// Licensed under the GNU LGPLv3 license.

import { commands, Position, Range, Selection, SnippetString, SnippetTextEdit, TextEdit, TextEditor, Uri, window, workspace, WorkspaceEdit, WorkspaceEditEntryMetadata } from 'vscode';
import * as ls from 'vscode-languageserver-protocol';
import { handleErrors } from './errorUtils';

export async function applyWorkspaceEdit(edit: ls.WorkspaceEdit): Promise<void> {
  const workspaceEdit: WorkspaceEdit = toWorkspaceEdit(edit);
  if (workspaceEdit.size > 0) {
    await workspace.applyEdit(workspaceEdit);
    // By executing the range formatting command to correct the indention according to the VS Code editor settings.
    // More details, see: https://github.com/redhat-developer/vscode-java/issues/557
    try {
      const currentEditor: TextEditor | undefined = window.activeTextEditor;
      const entries: [Uri, TextEdit[]][] = workspaceEdit.entries();
      // If the Uri path of the edit change is not equal to that of the active editor, we will skip the range formatting
      if (!currentEditor || entries.length === 0 || entries[0][1].length === 0
          || currentEditor.document.uri.fsPath !== entries[0][0].fsPath) {
        return;
      }
      const cursorPostion: Position = currentEditor.selection.active;
      // Get the array of all the changes
      const changes: TextEdit[] = entries[0][1];
      // Get the position information of the first change
      let startPosition: Position = new Position(changes[0].range.start.line, changes[0].range.start.character);
      let lineOffsets: number = changes[0].newText.split(/\r?\n/).length - 1;
      for (let i: number = 1; i < changes.length; i++) {
        // When it comes to a discontinuous range, execute the range formatting and record the new start position
        if (changes[i].range.start.line !== startPosition.line) {
          await executeRangeFormat(currentEditor, startPosition, lineOffsets);
          startPosition = new Position(changes[i].range.start.line, changes[i].range.start.character);
          lineOffsets = 0;
        }
        lineOffsets += changes[i].newText.split(/\r?\n/).length - 1;
      }
      await executeRangeFormat(currentEditor, startPosition, lineOffsets);
      // Recover the cursor's original position
      currentEditor.selection = new Selection(cursorPostion, cursorPostion);
    } catch (error) {
      handleErrors(error);
    }
  }
}

function toWorkspaceEdit(edit: ls.WorkspaceEdit): WorkspaceEdit {
  const workspaceEdit: WorkspaceEdit = new WorkspaceEdit();
  if (edit.documentChanges) {
    for (const change of edit.documentChanges) {
      if (ls.TextDocumentEdit.is(change)) {
        const uri: Uri = Uri.parse(change.textDocument.uri);
        workspaceEdit.set(uri, change.edits.map((textEdit: ls.TextEdit | ls.AnnotatedTextEdit | ls.SnippetTextEdit) => toTextEditEntry(textEdit, edit.changeAnnotations)));
      } else if (ls.CreateFile.is(change)) {
        workspaceEdit.createFile(Uri.parse(change.uri), change.options, getMetadata(change.annotationId, edit.changeAnnotations));
      } else if (ls.RenameFile.is(change)) {
        workspaceEdit.renameFile(
          Uri.parse(change.oldUri),
          Uri.parse(change.newUri),
          change.options,
          getMetadata(change.annotationId, edit.changeAnnotations),
        );
      } else if (ls.DeleteFile.is(change)) {
        workspaceEdit.deleteFile(
          Uri.parse(change.uri),
          change.options,
          getMetadata(change.annotationId, edit.changeAnnotations),
        );
      } else {
        throw new Error('Unsupported workspace edit operation.');
      }
    }
  } else {
    for (const [uri, edits] of Object.entries(edit.changes || {})) {
      workspaceEdit.set(Uri.parse(uri), edits.map((textEdit: ls.TextEdit) => toTextEditEntry(textEdit, edit.changeAnnotations)));
    }
  }
  return workspaceEdit;
}

function toTextEditEntry(
  edit: ls.TextEdit | ls.AnnotatedTextEdit | ls.SnippetTextEdit,
  annotations: ls.WorkspaceEdit['changeAnnotations'],
): [TextEdit | SnippetTextEdit, WorkspaceEditEntryMetadata | undefined] {
  const range: Range = new Range(
    new Position(edit.range.start.line, edit.range.start.character),
    new Position(edit.range.end.line, edit.range.end.character),
  );
  const textEdit: TextEdit | SnippetTextEdit = ls.SnippetTextEdit.is(edit)
    ? SnippetTextEdit.replace(range, new SnippetString(edit.snippet.value))
    : TextEdit.replace(range, edit.newText);
  const annotationId: string | undefined = 'annotationId' in edit ? edit.annotationId : undefined;
  return [textEdit, getMetadata(annotationId, annotations)];
}

function getMetadata(
  annotationId: string | undefined,
  annotations: ls.WorkspaceEdit['changeAnnotations'],
): WorkspaceEditEntryMetadata | undefined {
  if (!annotationId || !annotations?.[annotationId]) {
    return undefined;
  }
  const annotation: ls.ChangeAnnotation = annotations[annotationId];
  return {
    label: annotation.label,
    needsConfirmation: annotation.needsConfirmation || false,
    description: annotation.description,
  };
}

async function executeRangeFormat(editor: TextEditor, startPosition: Position, lineOffset: number): Promise<void> {
  const endPosition: Position = editor.document.positionAt(editor.document.offsetAt(new Position(startPosition.line + lineOffset + 1, 0)) - 1);
  editor.selection = new Selection(startPosition, endPosition);
  await commands.executeCommand('editor.action.formatSelection');
}
