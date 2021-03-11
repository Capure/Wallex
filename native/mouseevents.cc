#include "./mouseevents.h"

#include <windows.h>
#include <iostream>
#include <vector>

namespace mouseevents {
  HHOOK _hook;
  HWND hwnd;
  HANDLE _hThread;
  HWND slv_32;

  int jsOffsetX;
  int jsOffsetY;

  void Move(int x, int y) {
    LPARAM mousePosWallpaper = MAKELPARAM(x - jsOffsetX, y - jsOffsetY);
    PostMessageA(hwnd, WM_MOUSEMOVE,0 , mousePosWallpaper);
  }

  void LMB_Down(int x, int y) {
    LPARAM mousePosWallpaper = MAKELPARAM(x - jsOffsetX, y - jsOffsetY);
    PostMessageA(hwnd, WM_LBUTTONDOWN, 0, mousePosWallpaper);
  }

  void LMB_Up(int x, int y) {
    LPARAM mousePosWallpaper = MAKELPARAM(x - jsOffsetX, y - jsOffsetY);
    PostMessageA(hwnd, WM_LBUTTONUP, 0, mousePosWallpaper);
  }

  LRESULT CALLBACK HookCallback(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0) {
        MSLLHOOKSTRUCT *data = (MSLLHOOKSTRUCT *)lParam;
        if (WindowFromPoint(data->pt) != slv_32) {
            return CallNextHookEx(_hook, nCode, wParam, lParam);
        }
        auto x = data->pt.x;
        auto y = data->pt.y;

        if (wParam == WM_LBUTTONUP) {
            LMB_Up(x, y);
        } else if (wParam == WM_LBUTTONDOWN) {
            LMB_Down(x, y);
        } else if (wParam == WM_MOUSEMOVE) {
            Move(x, y);
        }
    }

    return CallNextHookEx(_hook, nCode, wParam, lParam);
  }

  DWORD WINAPI MouseHookThread(LPVOID lpParam) {
    _hook = SetWindowsHookEx(WH_MOUSE_LL, HookCallback, NULL, 0);

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0) > 0) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return 0;
  }

  BOOL CALLBACK FindSysListView32(HWND hwnd, LPARAM param) {
    HWND shell_dll = FindWindowExA(hwnd, NULL, (LPCSTR)"SHELLDLL_DefView", NULL);

    if (shell_dll) {
        slv_32 = FindWindowExA(shell_dll, NULL, (LPCSTR)"SysListView32", NULL);
        return FALSE;
    }

    return TRUE;
  }

  void createMouseForwarder(unsigned char* handleBuffer, int offsetX, int offsetY) {
    LONG_PTR handle = *reinterpret_cast<LONG_PTR*>(handleBuffer);
    hwnd = (HWND)(LONG_PTR)handle;

    jsOffsetX = offsetX;
    jsOffsetY = offsetY;

    EnumWindows(&FindSysListView32, NULL);

    DWORD dwThreadID;
    _hThread = CreateThread(NULL, 0, MouseHookThread, NULL, 0, &dwThreadID);
  }
}
