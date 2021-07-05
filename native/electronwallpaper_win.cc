/*
 * Copyright 2018 Robin Andersson <me@robinwassen.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ---------------------------------------------------------------
 *
 * This file was modified on March the 6th 2021 by Kacper Stolarek
 *
 */

#include "./electronwallpaper.h"

#include <iostream>
#include <windows.h>

namespace electronwallpaper {
// Message to Progman to spawn a WorkerW
int WM_SPAWN_WORKER = 0x052C;

// TODO(robin): Use the EnumWindows callback
// instead of a global
HWND workerw = NULL;

// Window enumerator that will set the
// window handle for the WorkerW that is the next
// sibling to SHELLDLL_DefView
BOOL CALLBACK FindWorkerW(HWND hwnd, LPARAM param) {
  HWND shelldll = FindWindowExA(hwnd, NULL, "SHELLDLL_DefView", NULL);

  if (shelldll) {
    workerw = FindWindowExA(NULL, hwnd, "WorkerW", NULL);
    return FALSE;
  }

  return TRUE;
}

void AttachWindow(unsigned char *handleBuffer, int OffsetX, int OffsetY,
                  int Width, int Height) {
  LONG_PTR handle = *reinterpret_cast<LONG_PTR *>(handleBuffer);
  HWND hwnd = (HWND)(LONG_PTR)handle;

  AttachWindow(hwnd, OffsetX, OffsetY, Width, Height);
}

void AttachWindow(HWND hwnd, int OffsetX, int OffsetY, int Width, int Height) {
  HWND progman = FindWindowA("Progman", NULL);
  LRESULT result = SendMessageTimeout(progman, WM_SPAWN_WORKER, NULL, NULL,
                                      SMTO_NORMAL, 1000, NULL);

  if (!result) {
    // TODO(robin): GetLastError() and handle properly
  }

  // TODO(robin): Handle return value of EnumWindows
  EnumWindows(&FindWorkerW, reinterpret_cast<LPARAM>(&workerw));

  // Update style of the Window we want to attach
  SetWindowLong(hwnd, GWL_EXSTYLE, WS_EX_LAYERED);
  SetParent(hwnd, workerw);
  SetWindowPos(hwnd, NULL, OffsetX, OffsetY, Width, Height, 0);
}

void DetachWindow(unsigned char *handleBuffer) {
  LONG_PTR handle = *reinterpret_cast<LONG_PTR *>(handleBuffer);
  HWND hwnd = (HWND)(LONG_PTR)handle;

  // TODO(robin): Remove the style update we applied

  SetParent(hwnd, workerw);
}
} // namespace electronwallpaper
