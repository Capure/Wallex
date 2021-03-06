{
  "targets": [
    {
      "target_name": "electron-wallpaper",
      "sources": [
        "native/output.cc",
        "native/bindings.cc"
      ],
       "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
      ],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
      "configurations": {
        "Release": {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1
              }
            }
        }
      },
      "conditions": [
        [
          "OS==\"win\"",
          {
            "sources": ["native/electronwallpaper_win.cc"]
          }
        ],
        [
          "OS!=\"win\"",
          {
            "sources": ["native/electronwallpaper_noop.cc"]
          }
        ]
      ]
    }
  ]
}