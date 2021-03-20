#include <windows.h>
#include <iostream>
#include <vector>

namespace cpusaver {
    RECT rect;
    HANDLE thHandle;
    DWORD thId;
    BOOL isListeningForExit = FALSE;

    struct WindowSize {
        int height;
        int width;
    };
    
    class CpuSaverThreadData {
        public: // TODO: unfuck this
        HWND main_window_handle;
        BOOL minimized = FALSE;
        BOOL windowIsOpen = TRUE;
        WindowSize main_window_size;
        int offset_x = 0;
        int offset_y = 0;
    };

    struct WindowDataPair {
        HWND hwnd;
        CpuSaverThreadData* data;
            // ^ This is a memory leak
            // every time you spawn a new wallpaper
            // a new CpuSaverThreadData object is created
            // you cannot just use delete and free the memory
            // cuz you will get a seg fault thanks to multiple threads accessing this object at once
            // so one of them can still be using a pointer to the object you just deleted
            // honestly it's not that big of a deal cuz at the end of the day
            // thoes wallpapers are using electron
            // so you have too much memory anyways 
    };

    std::vector<WindowDataPair> openWindows;
    // ^ This is also a memory leak
    // it just grows and never gets smaller
    // same reason as above

    void setAsClosed(HWND hwnd) {
        for (int i = 0; i < openWindows.size(); i++) {
            if (openWindows[i].hwnd == hwnd) {
                openWindows[i].data->windowIsOpen = FALSE;
            }
        }
    }

    void Minimize(HWND hwnd) {
        WINDOWPLACEMENT window_placement;
        GetWindowPlacement(hwnd, &window_placement);
        window_placement.showCmd = SW_SHOWMINIMIZED;
        SetWindowPlacement(hwnd, &window_placement);
    }

    void Maximize(HWND hwnd) {
        WINDOWPLACEMENT window_placement;
        GetWindowPlacement(hwnd, &window_placement);
        window_placement.showCmd = SW_RESTORE;
        SetWindowPlacement(hwnd, &window_placement);
    }

    BOOL CheckForFullscreen(CpuSaverThreadData *data) {
        POINT middle;
        middle.x = (data->main_window_size.width / 2) + data->offset_x;
        middle.y = (data->main_window_size.height / 2) + data->offset_y;
        HWND middleWindow = WindowFromPoint(middle);
        HWND parentOfMiddle = GetParent(middleWindow);
        if (parentOfMiddle) {
            middleWindow = parentOfMiddle;
        }

        RECT middleRect;
        GetWindowRect(middleWindow, &middleRect);
        int width = middleRect.right - middleRect.left;
        int height = middleRect.bottom - middleRect.top;
        if (middleWindow == GetDesktopWindow()) {
            return FALSE;
        }

        char className[256];
        GetClassNameA(middleWindow, className, 256);

        if (!strcmp(className, "SHELLDLL_DefView") || !strcmp(className, "SysListView32")) {
            return FALSE;
        }
        if (height >= data->main_window_size.height && width >= data->main_window_size.width) {
            return TRUE;
        }
        return FALSE;
    }


    inline void WinEventProc(HWINEVENTHOOK hWinEventHook,
                                DWORD         event,
                                HWND          hwnd,
                                LONG          idObject,
                                LONG          idChild,
                                DWORD         dwEventThread,
                                DWORD         dwmsEventTime) {
      if ( idObject == OBJID_WINDOW && idChild == CHILDID_SELF ) {
        setAsClosed(hwnd);
      }
    }

    DWORD WINAPI ListenForWindowExit(LPVOID lpParam) {
        HWINEVENTHOOK hook = SetWinEventHook(EVENT_OBJECT_DESTROY,
                                            EVENT_OBJECT_DESTROY,
                                            NULL,
                                            WinEventProc,
                                            NULL,
                                            NULL,
                                            WINEVENT_OUTOFCONTEXT);
        
        MSG msg;
        while (GetMessage(&msg, NULL, 0, 0) > 0) {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        }

        UnhookWinEvent(hook);

        return 0;
    }

    DWORD WINAPI CpuSaverThread(LPVOID lParam) {
        CpuSaverThreadData& cpuSaverData = *reinterpret_cast<CpuSaverThreadData *>(lParam);
        while (cpuSaverData.windowIsOpen) {
            if (CheckForFullscreen(&cpuSaverData)) {
                if (!cpuSaverData.minimized) {
                    Minimize(cpuSaverData.main_window_handle);
                    cpuSaverData.minimized = TRUE;
                }
            } else {
                if (cpuSaverData.minimized) {
                    Maximize(cpuSaverData.main_window_handle);
                    cpuSaverData.minimized = FALSE;
                }
            }
            Sleep(3000); // Isn't too long but doesn't clog the cpu
        }
        return 0;
    }

    void AttachSaver(unsigned char* handleBuffer, int OffsetX, int OffsetY, int SafeWidth, int SafeHeight) {
        LONG_PTR handle = *reinterpret_cast<LONG_PTR*>(handleBuffer);
        HWND hwnd = (HWND)(LONG_PTR)handle;
        CpuSaverThreadData* cpuSaverData = new CpuSaverThreadData();
        cpuSaverData->main_window_handle = hwnd;
        cpuSaverData->main_window_size.width = SafeWidth;
        cpuSaverData->main_window_size.height = SafeHeight;
        cpuSaverData->offset_x = OffsetX;
        cpuSaverData->offset_y = OffsetY;
        WindowDataPair windowDataPair;
        windowDataPair.hwnd = hwnd;
        windowDataPair.data = cpuSaverData;
        openWindows.push_back(windowDataPair);
        if (!isListeningForExit) {
            DWORD dThID;
            CreateThread(NULL, NULL, ListenForWindowExit, NULL, NULL, &dThID);
        }
        thHandle = CreateThread(NULL, NULL, CpuSaverThread, (LPVOID)cpuSaverData, NULL, &thId);
    }
}