{
  'targets': [
    {
     'target_name': 'attach_wallpaper'
    }
  ],
  'conditions': [
    ['OS=="win"', {
      'targets': [
        {
          'sources': [ 'native/win32/attach_wallpaper.cc' ],
          'win_delay_load_hook': 'true'
        }
      ]
    }]
  ]
}