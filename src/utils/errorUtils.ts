// Copyright (c) jdneo. All rights reserved.
// Licensed under the GNU LGPLv3 license.

import * as vscode from 'vscode';
import { checkstyleChannel } from '../checkstyleChannel';
import { checkstyleConfigurationManager } from '../checkstyleConfigurationManager';
import { checkstyleStatusBar } from '../checkstyleStatusBar';

export async function handleErrors(error: unknown): Promise<void> {
  const errorData: unknown = error !== null && typeof error === 'object' && 'data' in error ? error.data : undefined;
  if (errorData !== undefined && errorData !== null) {
    const messageValue: unknown = typeof errorData === 'object' && 'message' in errorData ? errorData.message : undefined;
    const message: string | undefined = typeof messageValue === 'string' ? messageValue : undefined;
    if (message && message.startsWith('cannot initialize module')) {
      handleModuleIntialization(message);
    }
    checkstyleChannel.appendLine(JSON.stringify(errorData) || String(errorData));
  } else {
    checkstyleChannel.appendLine(error instanceof Error ? error.stack || error.toString() : String(error));
  }

  checkstyleStatusBar.showError();
}

async function handleModuleIntialization(message: string): Promise<void> {
  const module: string = message.match(/cannot initialize module (.+?) -/)![1];
  const choice: string | undefined = await vscode.window.showErrorMessage(
    `Module ${module} initialization failed. It may be caused by wrong configuraiton or incompatible version.`,
    'Select another version', 'Open Configuration',
  );
  if (choice === 'Select another version') {
    vscode.commands.executeCommand('java.checkstyle.setVersion');
  } else if (choice === 'Open Configuration') {
    if (checkstyleConfigurationManager.configUri) {
      vscode.workspace.openTextDocument(checkstyleConfigurationManager.configUri).then((document: vscode.TextDocument) => {
        return vscode.window.showTextDocument(document);
      });
    }
  }
}
